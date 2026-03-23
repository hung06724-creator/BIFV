/**
 * Core domain types
 */
export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'pending_classification' | 'classified' | 'confirmed' | 'exported' | 'matched' | 'mismatched';
export type SplitMode = 'direct' | 'horizontal' | 'vertical';
export type AllocationType = SplitMode;
export type AllocationStatus = 'draft' | 'classified' | 'confirmed';
export type RuleType = 'exact' | 'keyword' | 'regex' | 'amount' | 'composite' | 'fallback';
export type AuditAction = 'insert' | 'update' | 'delete' | 'manual_override';
export type BatchStatus = 'processing' | 'reviewing' | 'completed' | 'failed';

export interface BankTransaction {
  id: string;
  batch_id: string;
  raw_date?: string;
  raw_desc?: string;
  raw_amount?: string;
  raw_reference?: string;
  normalized_date: string;
  normalized_amount: number;
  type: TransactionType;
  split_mode?: SplitMode;
  status: TransactionStatus;
  created_at?: string;
  updated_at?: string;
}

export interface ClassificationRule {
  id: string;
  category_id: string;
  category_code?: string;
  keyword: string;
  type: RuleType;
  priority: number;
  amount_min?: number;
  amount_max?: number;
  conditions?: any;
  stop_on_match: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ExtractionStatus = 
  | 'chua_trich_xuat'
  | 'khong_trich_xuat_duoc'
  | 'da_trich_xuat_chua_xac_nhan'
  | 'da_trich_xuat_trung_thong_tin'
  | 'da_xac_nhan';
