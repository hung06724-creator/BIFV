import type { TransactionStatus, ReviewStatus, TransactionType, AuditAction, RuleType } from '@/domain/types';

export interface TransactionMatchView {
  suggested_category_id: string | null;
  suggested_category_code: string | null;
  suggested_category_name: string | null;
  confidence_score: number;
  is_manually_overridden: boolean;
  confirmed_category_id: string | null;
  confirmed_category_code: string | null;
  confirmed_category_name: string | null;
  review_status: ReviewStatus;
  reviewer_name: string | null;
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
  status: TransactionStatus;
  sender_name: string | null;
  match: TransactionMatchView | null;
}

export interface TransactionFilters {
  search: string;
  batch_id: string;
  status: TransactionStatus | '';
  review_status: ReviewStatus | '';
  type: TransactionType | '';
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

export type BulkAction = 'assign_category' | 'change_review_status' | 'confirm';

export const EMPTY_FILTERS: TransactionFilters = {
  search: '',
  batch_id: '',
  status: '',
  review_status: '',
  type: '',
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
  review_status: ReviewStatus;
  reviewer_id: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
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
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
  parsed: TransactionDetailParsed;
  match: TransactionDetailMatch | null;
  audit_logs: AuditLogEntry[];
}
