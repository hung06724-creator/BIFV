import { useState, useCallback, useRef } from 'react';
import type {
  ImportStep,
  BankCode,
  UploadResult,
  ParseResult,
  ClassifyResult,
  ColumnMapping,
} from './types';
import type { TransactionListItem } from '@/components/features/transactions/types';
import { ParserService } from '@/services/parser.service';
import { ClassificationService } from '@/services/classification.service';
import { AllocationService } from '@/services/allocation.service';
import { useAppStore } from '@/lib/store';
import type { BankTransaction } from '@/domain/types';

const parser = new ParserService();
const classifier = new ClassificationService();
const allocationService = new AllocationService();

function classifyTransaction(
  transaction: TransactionListItem,
  currentRules: any[],
  categories: Array<{ id: string; name: string; code: string }>
) {
  let classifiedCount = 0;
  let highConfidenceCount = 0;
  let lowConfidenceCount = 0;
  const categoryCounts: Record<string, number> = {};

  const allocations = transaction.allocations.map((allocation) => {
    if (allocation.suggested_category_id || allocation.confirmed_category_id) {
      return allocation;
    }

    const matchResult = classifier.evaluateRules(transaction as unknown as BankTransaction, currentRules as any);
    if (!matchResult.suggested_category_id) {
      return allocation;
    }

    classifiedCount += 1;
    if (matchResult.confidence_score >= 0.8) highConfidenceCount += 1;
    else lowConfidenceCount += 1;

    const category = categories.find((item) => item.id === matchResult.suggested_category_id);
    const categoryName = category?.name || 'Unknown';
    categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;

    return {
      ...allocation,
      suggested_category_id: matchResult.suggested_category_id,
      suggested_category_code: matchResult.suggested_category_code || category?.code || null,
      suggested_category_name: category?.name || null,
      status: 'classified' as const,
    };
  });

  return {
    transaction: {
      ...transaction,
      allocations,
      status: allocationService.deriveStatus(
        transaction.status,
        transaction.normalized_amount,
        transaction.split_mode,
        allocations
      ),
      match: allocationService.deriveMatch(allocations),
    },
    classifiedCount,
    highConfidenceCount,
    lowConfidenceCount,
    categoryCounts,
  };
}

export function useImportFlow() {
  const addTransactions = useAppStore((s) => s.addTransactions);
  const rules = useAppStore((s) => s.rules);
  const updateTransactions = useAppStore((s) => s.updateTransactions);
  const categories = useAppStore((s) => s.categories);

  const [step, setStep] = useState<ImportStep>('upload');
  const [bankCode, setBankCode] = useState<BankCode>('BIDV');
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileBufferRef = useRef<ArrayBuffer | null>(null);

  const upload = useCallback(
    async (selectedFile: File) => {
      setLoading(true);
      setError(null);
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        fileBufferRef.current = arrayBuffer;

        const preview = await parser.previewFileBuffer(arrayBuffer, bankCode);

        const result: UploadResult = {
          batch_id: `batch-${Date.now()}`,
          filename: selectedFile.name,
          file_hash: '',
          bank_code: bankCode,
          status: 'processing',
          detected_columns: preview.detectedColumns,
          preview_rows: preview.previewRows,
          total_rows: preview.totalRows,
          created_at: new Date().toISOString(),
        };

        setFile(selectedFile);
        setUploadResult(result);
        setStep('preview');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [bankCode]
  );

  const parse = useCallback(
    async (_columnMapping?: Partial<ColumnMapping>) => {
      if (!uploadResult || !fileBufferRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const parsed = await parser.parseFileBuffer(fileBufferRef.current, uploadResult.bank_code);

        const listItems: TransactionListItem[] = parsed.map((t, idx) => {
          const isCredit = t.type === 'credit';
          const amount = t.normalized_amount || 0;
          const id = `${uploadResult.batch_id}-${idx}`;
          const splitMode = allocationService.detectSplitMode({
            raw_desc: t.raw_desc || '',
            normalized_amount: amount,
          });
          const allocations = allocationService.createAllocations(
            {
              id,
              raw_desc: t.raw_desc || '',
              normalized_amount: amount,
            },
            categories
          );

          return {
            id,
            batch_id: uploadResult.batch_id,
            raw_date: t.raw_date || '',
            raw_desc: t.raw_desc || '',
            raw_reference: t.raw_reference || null,
            normalized_date: t.normalized_date || '',
            normalized_amount: amount,
            debit_amount: isCredit ? 0 : amount,
            credit_amount: isCredit ? amount : 0,
            balance_after: null,
            type: t.type || 'credit',
            split_mode: splitMode,
            status: allocationService.deriveStatus('pending_classification', amount, splitMode, allocations),
            sender_name: null,
            allocations,
            match: allocationService.deriveMatch(allocations),
          };
        });

        const duplicateCount = addTransactions(
          listItems,
          { id: uploadResult.batch_id, filename: uploadResult.filename },
          uploadResult.bank_code
        );

        const newCount = parsed.length - duplicateCount;

        const result: ParseResult = {
          batch_id: uploadResult.batch_id,
          status: 'reviewing',
          total_parsed: newCount,
          total_skipped: uploadResult.total_rows - newCount,
          skipped_reasons:
            duplicateCount > 0
              ? [{ row_index: 0, reason: `${duplicateCount} giao dá»‹ch trÃ¹ng Ä‘Ã£ bá»‹ loáº¡i bá».` }]
              : [],
          sample_transactions: parsed.slice(0, 10).map((t) => ({
            raw_date: t.raw_date || '',
            raw_desc: t.raw_desc || '',
            normalized_date: t.normalized_date || '',
            normalized_amount: t.normalized_amount || 0,
            type: t.type || 'credit',
          })),
        };

        setParseResult(result);
        setStep('parsing');

        let classifiedCount = 0;
        let highConfidenceCount = 0;
        let lowConfidenceCount = 0;
        const categoryCounts: Record<string, number> = {};
        const splitSummary = {
          direct: listItems.filter((item) => item.split_mode === 'direct').length,
          horizontal: listItems.filter((item) => item.split_mode === 'horizontal').length,
          vertical: listItems.filter((item) => item.split_mode === 'vertical').length,
        };

        const currentRules = rules.map((r) => ({
          ...r,
          amount_min: r.amount_min ?? undefined,
          amount_max: r.amount_max ?? undefined,
        }));

        updateTransactions(uploadResult.bank_code as any, (t) => {
          if (t.batch_id !== result.batch_id || t.type === 'debit') return t;

          const classified = classifyTransaction(t, currentRules, categories);
          classifiedCount += classified.classifiedCount;
          highConfidenceCount += classified.highConfidenceCount;
          lowConfidenceCount += classified.lowConfidenceCount;

          for (const [key, value] of Object.entries(classified.categoryCounts)) {
            categoryCounts[key] = (categoryCounts[key] || 0) + value;
          }

          return classified.transaction;
        });

        const topCategories = Object.entries(categoryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => {
            const cat = categories.find((c) => c.name === name);
            return {
              category_id: cat?.id || '',
              category_code: cat?.code || '',
              category_name: name,
              count,
            };
          });

        const classifyRes: ClassifyResult = {
          batch_id: result.batch_id,
          total_transactions: result.total_parsed,
          classification_summary: {
            classified: classifiedCount,
            unclassified: result.total_parsed - classifiedCount,
            high_confidence: highConfidenceCount,
            low_confidence: lowConfidenceCount,
            already_confirmed: 0,
          },
          split_summary: {
            ...splitSummary,
            review_required: splitSummary.horizontal + splitSummary.vertical,
          },
          top_categories: topCategories,
        };

        setClassifyResult(classifyRes);
        setStep('classifying');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [uploadResult, addTransactions, rules, updateTransactions, categories]
  );

  const classify = useCallback(async () => {
    if (!parseResult || !uploadResult) return;
    setLoading(true);
    setError(null);
    try {
      let classifiedCount = 0;
      let highConfidenceCount = 0;
      let lowConfidenceCount = 0;
      const categoryCounts: Record<string, number> = {};
      const allTransactions = uploadResult.bank_code === 'BIDV'
        ? useAppStore.getState().bidvTransactions
        : useAppStore.getState().agribankTransactions;
      const batchTransactions = allTransactions.filter((item) => item.batch_id === parseResult.batch_id);
      const splitSummary = {
        direct: batchTransactions.filter((item) => item.split_mode === 'direct').length,
        horizontal: batchTransactions.filter((item) => item.split_mode === 'horizontal').length,
        vertical: batchTransactions.filter((item) => item.split_mode === 'vertical').length,
      };

      const currentRules = rules.map((r) => ({
        ...r,
        amount_min: r.amount_min ?? undefined,
        amount_max: r.amount_max ?? undefined,
      }));

      updateTransactions(uploadResult.bank_code as any, (t) => {
        if (t.batch_id !== parseResult.batch_id || t.type === 'debit') return t;

        const classified = classifyTransaction(t, currentRules, categories);
        classifiedCount += classified.classifiedCount;
        highConfidenceCount += classified.highConfidenceCount;
        lowConfidenceCount += classified.lowConfidenceCount;

        for (const [key, value] of Object.entries(classified.categoryCounts)) {
          categoryCounts[key] = (categoryCounts[key] || 0) + value;
        }

        return classified.transaction;
      });

      const topCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => {
          const cat = categories.find((c) => c.name === name);
          return {
            category_id: cat?.id || '',
            category_code: cat?.code || '',
            category_name: name,
            count,
          };
        });

      const result: ClassifyResult = {
        batch_id: parseResult.batch_id,
        total_transactions: parseResult.total_parsed,
        classification_summary: {
          classified: classifiedCount,
          unclassified: parseResult.total_parsed - classifiedCount,
          high_confidence: highConfidenceCount,
          low_confidence: lowConfidenceCount,
          already_confirmed: 0,
        },
        split_summary: {
          ...splitSummary,
          review_required: splitSummary.horizontal + splitSummary.vertical,
        },
        top_categories: topCategories,
      };

      setClassifyResult(result);
      setStep('classifying');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [parseResult, uploadResult, rules, updateTransactions, categories]);

  const finish = useCallback(() => {
    setStep('done');
  }, []);

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setUploadResult(null);
    setParseResult(null);
    setClassifyResult(null);
    setError(null);
    setLoading(false);
    fileBufferRef.current = null;
  }, []);

  return {
    step,
    bankCode,
    setBankCode,
    file,
    uploadResult,
    parseResult,
    classifyResult,
    loading,
    error,
    setError,
    upload,
    parse,
    classify,
    finish,
    reset,
  };
}
