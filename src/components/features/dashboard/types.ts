import type { TransactionStatus, ReviewStatus } from '@/domain/types';

export interface DashboardStats {
  total_transactions: number;
  total_credit: number;
  total_debit: number;
  net_amount: number;
  by_status: Record<TransactionStatus, number>;
  unresolved: number;       // pending_classification + classified with review=pending
  pending_review: number;   // classified with review=pending
  confirmed: number;
}

export interface CategoryBreakdown {
  category_code: string;
  category_name: string;
  count: number;
  total: number;
}

export interface UrgentTransaction {
  id: string;
  raw_date: string;
  raw_desc: string;
  normalized_amount: number;
  type: 'credit' | 'debit';
  status: TransactionStatus;
  confidence_score: number;
  suggested_category_name: string | null;
  review_status: ReviewStatus;
}
