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
import { useAppStore } from '@/lib/store';

const parser = new ParserService();

export function useImportFlow() {
  const addTransactions = useAppStore((s) => s.addTransactions);
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
        const parsed = await parser.parseFileBuffer(
          fileBufferRef.current,
          uploadResult.bank_code
        );

        // Save to global store
        const listItems: TransactionListItem[] = parsed.map((t, idx) => {
          const isCredit = t.type === 'credit';
          const amount = t.normalized_amount || 0;
          return {
            id: `${uploadResult.batch_id}-${idx}`,
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
            status: 'pending_classification',
            sender_name: null,
            match: null,
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
          skipped_reasons: duplicateCount > 0
            ? [{ row_index: 0, reason: `${duplicateCount} giao dịch trùng đã bị loại bỏ.` }]
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
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [uploadResult]
  );

  const classify = useCallback(async () => {
    if (!parseResult) return;
    setLoading(true);
    setError(null);
    try {
      const result: ClassifyResult = {
        batch_id: parseResult.batch_id,
        total_transactions: parseResult.total_parsed,
        classification_summary: {
          classified: 0,
          unclassified: parseResult.total_parsed,
          high_confidence: 0,
          low_confidence: 0,
          already_confirmed: 0,
        },
        top_categories: [],
      };

      setClassifyResult(result);
      setStep('classifying');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [parseResult]);

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
