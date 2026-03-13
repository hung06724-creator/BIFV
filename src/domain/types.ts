/**
 * Enums representing PostgreSQL custom types
 */
export type UserRole = 'admin' | 'accountant' | 'chief_accountant' | 'viewer';
export type BatchStatus = 'processing' | 'reviewing' | 'completed' | 'failed';
export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'pending_classification' | 'classified' | 'confirmed' | 'exported';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type RuleType = 'exact' | 'keyword' | 'regex' | 'amount' | 'composite' | 'fallback';
export type ExportType = 'reconciliation' | 'accounting' | 'summary';
export type AuditAction = 'insert' | 'update' | 'delete' | 'manual_override';

export interface User {
  id: string; // UUID from auth.users
  email: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RevenueCategory {
  id: string; // UUID
  code: string;
  name: string;
  group_name?: string;
  ledger_code?: string;
  priority?: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassificationRule {
  id: string; // UUID
  category_id: string; // UUID
  category_code?: string; // For joining convenience
  keyword: string; // Can be a regex pattern, pipe-separated keywords, or JSON string for composite
  type: RuleType;
  priority: number;
  amount_min?: number; // Optional for amount/composite rules
  amount_max?: number; // Optional for amount/composite rules
  conditions?: any; // JSON string or object for composite rules
  stop_on_match: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImportBatch {
  id: string; // UUID
  filename: string;
  file_hash: string;
  bank_code?: string;
  status: BatchStatus;
  total_records: number;
  created_by?: string; // UUID
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string; // UUID
  batch_id: string; // UUID
  raw_date?: string;
  raw_desc?: string;
  raw_amount?: string;
  raw_reference?: string;
  normalized_date: string;
  normalized_amount: number;
  type: TransactionType;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
}

export interface TransactionMatch {
  id: string; // UUID
  transaction_id: string; // UUID
  suggested_category_id?: string; // UUID
  rule_id?: string; // UUID
  confidence_score: number;
  is_manually_overridden: boolean;
  confirmed_category_id?: string; // UUID
  review_status: ReviewStatus;
  reviewer_id?: string; // UUID
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string; // UUID
  transaction_id: string; // UUID
  category_id: string; // UUID
  amount: number;
  entry_date: string;
  description?: string;
  created_by?: string; // UUID
  created_at: string;
}

export interface ExportBatch {
  id: string; // UUID
  export_type: ExportType;
  status: BatchStatus;
  file_url?: string;
  total_records: number;
  created_by?: string; // UUID
  created_at: string;
  completed_at?: string;
}

export interface AuditLog {
  id: string; // UUID
  table_name: string;
  record_id: string; // UUID
  action: AuditAction;
  old_values?: any; // JSON
  new_values?: any; // JSON
  user_id?: string; // UUID
  created_at: string;
}
