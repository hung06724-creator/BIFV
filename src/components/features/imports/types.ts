import type { BatchStatus } from '@/domain/types';

export type ImportStep = 'upload' | 'preview' | 'parsing' | 'classifying' | 'done';

export const BANK_OPTIONS = [
  { value: 'BIDV', label: 'BIDV' },
  { value: 'AGRIBANK', label: 'AGRIBANK' },
] as const;

export type BankCode = (typeof BANK_OPTIONS)[number]['value'];

export interface ColumnMapping {
  date_column: string;
  debit_column: string;
  credit_column: string;
  balance_column: string;
  description_columns: string[];
  reference_column: string;
}

export interface UploadResult {
  batch_id: string;
  filename: string;
  file_hash: string;
  bank_code: string;
  status: BatchStatus;
  detected_columns: string[];
  preview_rows: Record<string, any>[];
  total_rows: number;
  created_at: string;
}

export interface ParseResult {
  batch_id: string;
  status: 'reviewing';
  total_parsed: number;
  total_skipped: number;
  skipped_reasons: { row_index: number; reason: string }[];
  sample_transactions: {
    raw_date: string;
    raw_desc: string;
    normalized_date: string;
    normalized_amount: number;
    type: 'credit' | 'debit';
  }[];
}

export interface ClassifyResult {
  batch_id: string;
  total_transactions: number;
  classification_summary: {
    classified: number;
    unclassified: number;
    high_confidence: number;
    low_confidence: number;
    already_confirmed: number;
  };
  split_summary: {
    direct: number;
    horizontal: number;
    vertical: number;
    review_required: number;
  };
  top_categories: {
    category_id: string;
    category_code: string;
    category_name: string;
    count: number;
  }[];
}

export interface BatchInfo {
  id: string;
  filename: string;
  bank_code: string;
  status: BatchStatus;
  total_records: number;
  stats: {
    pending_classification: number;
    classified: number;
    confirmed: number;
    exported: number;
  };
  created_at: string;
  updated_at: string;
}
