import { useState, useCallback } from 'react';
import type { TransactionListItem, TransactionAllocationView } from '@/components/features/transactions/types';
import { ParserService } from '@/services/parser.service';
import { AllocationService } from '@/services/allocation.service';
import { useAppStore } from '@/lib/store';
import type { BankCode } from './types';

const parser = new ParserService();
const allocationService = new AllocationService();

export function useImportClassified() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const importFile = useCallback(async (file: File, bankCode: BankCode) => {
    setLoading(true);
    setError(null);
    setImportedCount(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsed = await parser.parseClassifiedBuffer(arrayBuffer, bankCode);

      const store = useAppStore.getState();
      let categories = [...store.categories];
      const batchId = `batch-classified-${Date.now()}`;

      // Auto-add category codes from file that don't exist in DB
      const existingCodes = new Set(categories.map((c) => c.code));
      for (const t of parsed) {
        for (const alloc of t.allocations) {
          if (!existingCodes.has(alloc.category_code)) {
            const newCat = {
              id: `cat-${alloc.category_code}-${Date.now()}`,
              code: alloc.category_code,
              name: alloc.category_code,
            };
            store.addCategory(newCat);
            categories.push(newCat);
            existingCodes.add(alloc.category_code);
          }
        }
      }

      const listItems: TransactionListItem[] = parsed.map((t, index) => {
        const txnId = `${batchId}-${index}`;
        const isCredit = t.type === 'credit';

        const allocations: TransactionAllocationView[] = t.allocations.map((alloc, allocIdx) => {
          const category = categories.find((c) => c.code === alloc.category_code);
          return {
            id: `${txnId}-alloc-${allocIdx + 1}`,
            transaction_id: txnId,
            allocation_no: allocIdx + 1,
            allocation_type: t.split_mode,
            amount: alloc.amount,
            suggested_category_id: category?.id || null,
            suggested_category_code: alloc.category_code,
            suggested_category_name: category?.name || alloc.category_code,
            confirmed_category_id: category?.id || null,
            confirmed_category_code: alloc.category_code,
            confirmed_category_name: category?.name || alloc.category_code,
            beneficiary_code: null,
            beneficiary_name: null,
            status: 'confirmed' as const,
            notes: null,
          };
        });

        const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
        const isBalanced = totalAllocated === t.normalized_amount;

        const status = allocationService.deriveStatus(
          isBalanced ? 'confirmed' : 'pending_classification',
          t.normalized_amount,
          t.split_mode,
          allocations,
        );

        return {
          id: txnId,
          batch_id: batchId,
          raw_date: t.raw_date,
          raw_desc: t.raw_desc,
          raw_reference: t.raw_reference || null,
          normalized_date: t.normalized_date,
          normalized_amount: t.normalized_amount,
          debit_amount: isCredit ? 0 : t.normalized_amount,
          credit_amount: isCredit ? t.normalized_amount : 0,
          balance_after: null,
          type: t.type,
          split_mode: t.split_mode,
          status,
          sender_name: t.sender_name,
          allocations,
          match: allocationService.deriveMatch(allocations),
        };
      });

      const duplicateCount = useAppStore.getState().addTransactions(
        listItems,
        { id: batchId, filename: file.name },
        bankCode,
        { overwriteClassified: true },
      );

      setImportedCount(listItems.length - duplicateCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, importedCount, importFile };
}
