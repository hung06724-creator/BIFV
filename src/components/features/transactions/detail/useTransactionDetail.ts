import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  AuditLogEntry,
  TransactionAllocationView,
  TransactionDetail,
  TransactionDetailMatch,
  TransactionListItem,
} from '../types';
import { AllocationService } from '@/services/allocation.service';
import { useAppStore, type BankTab } from '@/lib/store';
import { VietnameseTransactionParser } from '@/lib/parsers/VietnameseTransactionParser';

const allocationService = new AllocationService();
const parser = new VietnameseTransactionParser();

interface MatchMetaState {
  id: string;
  matched_rules: TransactionDetailMatch['matched_rules'];
  explanation: string;
}

function makeAuditEntry(action: AuditLogEntry['action'], newValues: Record<string, unknown>, oldValues: Record<string, unknown> | null = null): AuditLogEntry {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    old_values: oldValues,
    new_values: newValues,
    user_id: action === 'update' || action === 'manual_override' ? 'current-user' : null,
    user_name: action === 'update' || action === 'manual_override' ? 'Ban' : 'Classification Engine',
    created_at: new Date().toISOString(),
  };
}

function defaultMatchMeta(transactionId: string, splitMode: TransactionDetail['split_mode']): MatchMetaState {
  return {
    id: `match-${transactionId}`,
    matched_rules: [],
    explanation:
      splitMode === 'direct'
        ? 'Single allocation transaction.'
        : splitMode === 'horizontal'
          ? 'Split by fee components. Review each allocation before confirming.'
          : 'Split by beneficiary. Review each allocation before confirming.',
  };
}

export function useTransactionDetail(transactionId: string) {
  const bidvTransactions = useAppStore((s) => s.bidvTransactions);
  const agribankTransactions = useAppStore((s) => s.agribankTransactions);
  const categories = useAppStore((s) => s.categories);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [matchMeta, setMatchMeta] = useState<MatchMetaState | null>(null);

  const source = useMemo(() => {
    const bidv = bidvTransactions.find((item) => item.id === transactionId);
    if (bidv) {
      return { item: bidv, bank: 'BIDV' as BankTab };
    }

    const agribank = agribankTransactions.find((item) => item.id === transactionId);
    if (agribank) {
      return { item: agribank, bank: 'AGRIBANK' as BankTab };
    }

    return null;
  }, [bidvTransactions, agribankTransactions, transactionId]);

  useEffect(() => {
    if (source?.item) {
      setAuditLogs([]);
      setMatchMeta(defaultMatchMeta(source.item.id, source.item.split_mode));
      return;
    }

    setAuditLogs([]);
    setMatchMeta(null);
  }, [source, transactionId]);

  const transaction = useMemo<TransactionDetail | null>(() => {
    const item = source?.item;
    if (!item) return null;

    const parsed = parser.parseDescriptionOnly(item.raw_desc || '');
    const validation = allocationService.validateAllocations(item.normalized_amount, item.split_mode, item.allocations);
    const meta = matchMeta || defaultMatchMeta(item.id, item.split_mode);

    const match = item.match
      ? ({
          id: meta.id,
          suggested_category_id: item.match.suggested_category_id,
          suggested_category_code: item.match.suggested_category_code,
          suggested_category_name: item.match.suggested_category_name,
          confidence_score: item.match.confidence_score,
          matched_rules: meta.matched_rules,
          explanation: meta.explanation,
          is_manually_overridden: item.match.is_manually_overridden,
          confirmed_category_id: item.match.confirmed_category_id,
          confirmed_category_code: item.match.confirmed_category_code,
          confirmed_category_name: item.match.confirmed_category_name,
        } satisfies TransactionDetailMatch)
      : null;

    return {
      id: item.id,
      batch_id: item.batch_id,
      raw_date: item.raw_date,
      raw_desc: item.raw_desc,
      raw_amount: String(item.normalized_amount),
      raw_reference: item.raw_reference || '',
      normalized_date: item.normalized_date,
      normalized_amount: item.normalized_amount,
      debit_amount: item.debit_amount,
      credit_amount: item.credit_amount,
      balance_after: item.balance_after,
      type: item.type,
      split_mode: item.split_mode,
      status: item.status,
      created_at: `${item.normalized_date}T00:00:00.000Z`,
      updated_at: new Date().toISOString(),
      parsed: {
        sender_name: item.sender_name || parsed.sender_name || null,
        sender_bank: parsed.sender_bank || null,
        sender_account_hint: parsed.sender_account_hint || null,
        transfer_ref: parsed.transfer_ref || item.raw_reference || null,
        normalized_description: parsed.normalized_description,
        no_accent_description: parsed.no_accent_description,
      },
      allocations: item.allocations,
      validation,
      match,
      audit_logs: auditLogs,
    };
  }, [source, transactionId, auditLogs, matchMeta]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAllocation = useCallback(
    async (
      allocationNo: number,
      patch: Partial<Pick<TransactionAllocationView, 'amount' | 'beneficiary_name' | 'beneficiary_code' | 'notes'>>,
      categoryId?: string
    ) => {
      if (!source) return;

      const current = source.item;
      let nextTransaction;

      if (categoryId) {
        const category = categories.find((item) => item.id === categoryId);
        nextTransaction = allocationService.applyTransactionCategorySelection(current, category, true, allocationNo);
      } else if (categoryId === '') {
        // Clear category
        const allocations = current.allocations.map((a) => {
          if (a.allocation_no !== allocationNo) return a;
          return {
            ...a,
            suggested_category_id: null,
            suggested_category_code: null,
            suggested_category_name: null,
            confirmed_category_id: null,
            confirmed_category_code: null,
            confirmed_category_name: null,
            status: 'draft' as const,
          };
        });
        nextTransaction = {
          ...current,
          allocations,
          status: allocationService.deriveStatus(current.status, current.normalized_amount, current.split_mode, allocations),
          match: allocationService.deriveMatch(allocations),
        };
      } else {
        const allocations = allocationService.updateAllocationFields(current.allocations, allocationNo, patch);
        nextTransaction = {
          ...current,
          allocations,
          status: allocationService.deriveStatus(current.status, current.normalized_amount, current.split_mode, allocations),
          match: allocationService.deriveMatch(allocations),
        };
      }

      const finalTransaction = nextTransaction;

      // Derive sender_name from tuition saved records if available
      const tuitionRecords = useAppStore.getState().tuitionRecords || [];
      const tuitionRec = tuitionRecords.find(r => r.transactionId === transactionId);
      const senderName = tuitionRec?.confirmedStudent?.hoTen || null;

      useAppStore.getState().updateTransactions(source.bank, (item) => {
        if (item.id !== transactionId) return item;
        return {
          ...item,
          ...finalTransaction,
          sender_name: senderName || item.sender_name,
        };
      });

      setAuditLogs((prev) => [
        ...prev,
        makeAuditEntry(categoryId ? 'manual_override' : 'update', {
          allocation_no: allocationNo,
          patch,
          category_id: categoryId || null,
          split_mode: finalTransaction.split_mode,
        }),
      ]);
    },
    [source, categories, transactionId]
  );

  const addAllocation = useCallback(() => {
    if (!source) return;

    const current = source.item;
    const nextNo = current.allocations.length > 0
      ? Math.max(...current.allocations.map((a) => a.allocation_no)) + 1
      : 1;

    const newAlloc: TransactionAllocationView = {
      id: `${current.id}-alloc-${nextNo}`,
      transaction_id: current.id,
      allocation_no: nextNo,
      allocation_type: current.split_mode || 'direct',
      amount: 0,
      suggested_category_id: null,
      suggested_category_code: null,
      suggested_category_name: null,
      confirmed_category_id: null,
      confirmed_category_code: null,
      confirmed_category_name: null,
      beneficiary_code: null,
      beneficiary_name: null,
      status: 'draft',
      notes: null,
    };

    const allocations = [...current.allocations, newAlloc];

    useAppStore.getState().updateTransactions(source.bank, (item) => {
      if (item.id !== transactionId) return item;
      return {
        ...item,
        allocations,
        status: allocationService.deriveStatus(item.status, item.normalized_amount, item.split_mode, allocations),
        match: allocationService.deriveMatch(allocations),
      };
    });

    setAuditLogs((prev) => [
      ...prev,
      makeAuditEntry('insert', { allocation_no: nextNo, action: 'add_allocation' }),
    ]);
  }, [source, transactionId]);

  const removeAllocation = useCallback(
    (allocationNo: number) => {
      if (!source) return;

      const current = source.item;
      const allocations = current.allocations
        .filter((a) => a.allocation_no !== allocationNo)
        .map((a, idx) => ({ ...a, allocation_no: idx + 1 }));

      useAppStore.getState().updateTransactions(source.bank, (item) => {
        if (item.id !== transactionId) return item;
        return {
          ...item,
          allocations,
          status: allocationService.deriveStatus(item.status, item.normalized_amount, item.split_mode, allocations),
          match: allocationService.deriveMatch(allocations),
        };
      });

      setAuditLogs((prev) => [
        ...prev,
        makeAuditEntry('delete', { allocation_no: allocationNo, action: 'remove_allocation' }),
      ]);
    },
    [source, transactionId]
  );

  const confirmAllocations = useCallback(
    async (notes: string) => {
      if (!source) return;

      setLoading(true);
      try {
        const current = source.item;
        const allocations = allocationService.confirmAllocations(current.allocations);
        const nextMatch = allocationService.deriveMatch(allocations);
        const nextStatus = allocationService.deriveStatus(current.status, current.normalized_amount, current.split_mode, allocations);

        // Derive sender_name from tuition saved records if available
        const tuitionRecords = useAppStore.getState().tuitionRecords || [];
        const tuitionRec = tuitionRecords.find(r => r.transactionId === transactionId);
        const senderName = tuitionRec?.confirmedStudent?.hoTen || null;

        useAppStore.getState().updateTransactions(source.bank, (item) => {
          if (item.id !== transactionId) return item;
          return {
            ...item,
            allocations,
            status: nextStatus,
            match: nextMatch,
            notes: notes.trim() || item.notes || null,
            sender_name: senderName || item.sender_name,
          };
        });

        setAuditLogs((prev) => [
          ...prev,
          makeAuditEntry('update', { status: 'confirmed', notes, split_mode: current.split_mode }, { status: current.status }),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [source, transactionId]
  );

  const saveNote = useCallback(
    (note: string) => {
      if (!source || !note.trim()) return;
      useAppStore.getState().updateTransactions(source.bank, (item) => {
        if (item.id !== transactionId) return item;
        return { ...item, notes: note.trim() };
      });
    },
    [source, transactionId]
  );

  const clearNote = useCallback(
    () => {
      if (!source) return;
      useAppStore.getState().updateTransactions(source.bank, (item) => {
        if (item.id !== transactionId) return item;
        return { ...item, notes: null };
      });
    },
    [source, transactionId]
  );

  const copyAllocationsFrom = useCallback(
    (donor: TransactionListItem) => {
      if (!source) return;

      const current = source.item;

      const allocations: TransactionAllocationView[] = donor.allocations.map((a, idx) => ({
        ...a,
        id: `${current.id}-alloc-${idx + 1}`,
        transaction_id: current.id,
        allocation_no: idx + 1,
      }));

      const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
      const txnStatus = totalAllocated === current.normalized_amount ? 'matched' as const : 'mismatched' as const;

      useAppStore.getState().updateTransactions(source.bank, (item) => {
        if (item.id !== transactionId) return item;
        return {
          ...item,
          allocations,
          status: txnStatus,
          match: allocationService.deriveMatch(allocations),
        };
      });

      setAuditLogs((prev) => [
        ...prev,
        makeAuditEntry('update', {
          action: 'copy_allocations',
          from_transaction_id: donor.id,
          allocation_count: allocations.length,
        }),
      ]);
    },
    [source, transactionId]
  );

  const rerunSuggest = useCallback(async () => {
    if (!source) return;

    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      setMatchMeta((prev) => ({
        ...(prev || defaultMatchMeta(source.item.id, source.item.split_mode)),
        explanation:
          source.item.split_mode === 'direct'
            ? 'Suggestion refreshed for a direct transaction.'
            : source.item.split_mode === 'horizontal'
              ? 'Suggestion refreshed. Review fee component allocations.'
              : 'Suggestion refreshed. Review beneficiary allocations.',
      }));
      setAuditLogs((prev) => [
        ...prev,
        makeAuditEntry('update', {
          action: 'rerun_suggest',
          split_mode: source.item.split_mode,
          suggested_category_id: source.item.match?.suggested_category_id || null,
        }),
      ]);
    } finally {
      setLoading(false);
    }
  }, [source]);

  return {
    transaction,
    categories,
    loading,
    error,
    reload,
    updateAllocation,
    addAllocation,
    removeAllocation,
    confirmAllocations,
    saveNote,
    clearNote,
    copyAllocationsFrom,
    rerunSuggest,
    transactionNote: source?.item.notes ?? null,
  };
}
