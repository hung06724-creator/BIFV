import type { RuleType } from '@/domain/types';

export interface RuleListItem {
  id: string;
  category_id: string;
  category_code: string;
  category_name: string;
  keyword: string;
  type: RuleType;
  priority: number;
  amount_min: number | null;
  amount_max: number | null;
  conditions: any | null;
  stop_on_match: boolean;
  is_active: boolean;
  match_count: number;
  created_at: string;
  updated_at: string;
}

export interface RuleFormData {
  category_id: string;
  keyword: string;
  type: RuleType;
  priority: number;
  amount_min: string;
  amount_max: string;
  stop_on_match: boolean;
  is_active: boolean;
}

export interface CategoryOption {
  id: string;
  code: string;
  name: string;
}

export interface RuleTestResult {
  matched: boolean;
  confidence_score: number;
  explanation: string;
  search_string: string;
}

export const RULE_TYPE_OPTIONS: { value: RuleType; label: string; description: string }[] = [
  { value: 'exact', label: 'Exact', description: 'Khớp chính xác toàn bộ chuỗi (sau chuẩn hóa)' },
  { value: 'keyword', label: 'Keyword', description: 'Chứa từ khóa, dùng | để tách nhiều từ' },
  { value: 'regex', label: 'Regex', description: 'Biểu thức chính quy (case-insensitive)' },
  { value: 'amount', label: 'Amount', description: 'Khớp theo khoảng số tiền' },
  { value: 'composite', label: 'Composite', description: 'Kết hợp keyword + khoảng tiền' },
  { value: 'fallback', label: 'Fallback', description: 'Luôn khớp — dùng làm mặc định cuối' },
];

export const CONFIDENCE_MAP: Record<RuleType, number> = {
  exact: 1.0,
  regex: 0.95,
  composite: 0.9,
  keyword: 0.85,
  amount: 0.6,
  fallback: 0.1,
};

export const EMPTY_FORM: RuleFormData = {
  category_id: '',
  keyword: '',
  type: 'keyword',
  priority: 50,
  amount_min: '',
  amount_max: '',
  stop_on_match: false,
  is_active: true,
};
