import type {
  TransactionStatus,
  TransactionType,
  AuditAction,
  RuleType,
  SplitMode,
  AllocationType,
  AllocationStatus,
} from '@/domain/types';

export interface TransactionMatchView {
  suggested_category_id: string | null;
  suggested_category_code: string | null;
  suggested_category_name: string | null;
  confidence_score: number;
  is_manually_overridden: boolean;
  confirmed_category_id: string | null;
  confirmed_category_code: string | null;
  confirmed_category_name: string | null;
}

export interface TransactionAllocationView {
  id: string;
  transaction_id: string;
  allocation_no: number;
  allocation_type: AllocationType;
  amount: number;
  suggested_category_id: string | null;
  suggested_category_code: string | null;
  suggested_category_name: string | null;
  confirmed_category_id: string | null;
  confirmed_category_code: string | null;
  confirmed_category_name: string | null;
  beneficiary_code: string | null;
  beneficiary_name: string | null;
  status: AllocationStatus;
  notes: string | null;
}

export interface TransactionListItem {
  id: string;
  batch_id: string;
  raw_date: string;
  raw_desc: string;
  raw_reference: string | null;
  normalized_date: string;
  normalized_amount: number;
  debit_amount: number;
  credit_amount: number;
  balance_after: number | null;
  type: TransactionType;
  split_mode: SplitMode;
  status: TransactionStatus;
  sender_name: string | null;
  allocations: TransactionAllocationView[];
  match: TransactionMatchView | null;
  notes?: string | null;
}

export interface TransactionFilters {
  search: string;
  batch_id: string;
  status: TransactionStatus | '';
  type: TransactionType | '';
  split_mode: SplitMode | '';
  needs_review: boolean;
  suggested_category_id: string;
  confirmed_category_id: string;
  date_from: string;
  date_to: string;
  amount_min: string;
  amount_max: string;
}

export interface CategoryOption {
  id: string;
  code: string;
  name: string;
  group?: string;
  ledger_account?: string;
}

export interface BatchOption {
  id: string;
  filename: string;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export type BulkAction = 'assign_category' | 'confirm';

export const EMPTY_FILTERS: TransactionFilters = {
  search: '',
  batch_id: '',
  status: '',
  type: '',
  split_mode: '',
  needs_review: false,
  suggested_category_id: '',
  confirmed_category_id: '',
  date_from: '',
  date_to: '',
  amount_min: '',
  amount_max: '',
};

export interface TransactionDetailParsed {
  sender_name: string | null;
  sender_bank: string | null;
  sender_account_hint: string | null;
  transfer_ref: string | null;
  normalized_description: string;
  no_accent_description: string;
}

export interface MatchedRuleView {
  id: string;
  keyword: string;
  type: RuleType;
  priority: number;
  category_code: string;
  category_name: string;
}

export interface TransactionDetailMatch {
  id: string;
  suggested_category_id: string | null;
  suggested_category_code: string | null;
  suggested_category_name: string | null;
  confidence_score: number;
  matched_rules: MatchedRuleView[];
  explanation: string;
  is_manually_overridden: boolean;
  confirmed_category_id: string | null;
  confirmed_category_code: string | null;
  confirmed_category_name: string | null;
}

export interface TransactionValidationState {
  total_allocated: number;
  remaining_amount: number;
  is_balanced: boolean;
  has_unconfirmed_allocations: boolean;
  has_missing_beneficiaries: boolean;
  can_confirm: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

export interface TransactionDetail {
  id: string;
  batch_id: string;
  raw_date: string;
  raw_desc: string;
  raw_amount: string;
  raw_reference: string;
  normalized_date: string;
  normalized_amount: number;
  debit_amount: number;
  credit_amount: number;
  balance_after: number | null;
  type: TransactionType;
  split_mode: SplitMode;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
  parsed: TransactionDetailParsed;
  allocations: TransactionAllocationView[];
  validation: TransactionValidationState;
  match: TransactionDetailMatch | null;
  audit_logs: AuditLogEntry[];
}
