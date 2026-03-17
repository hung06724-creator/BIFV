import { useEffect, useMemo, useState } from 'react';
import { X, Save, Loader2, Info } from 'lucide-react';
import clsx from 'clsx';
import type { RuleFormData, CategoryOption, RuleListItem } from './types';
import { RULE_TYPE_OPTIONS, CONFIDENCE_MAP } from './types';

interface RuleFormProps {
  formData: RuleFormData;
  categories: CategoryOption[];
  editingRule: RuleListItem | null;
  loading: boolean;
  onFieldChange: <K extends keyof RuleFormData>(key: K, value: RuleFormData[K]) => void;
  onSave: () => void;
  onClose: () => void;
}

export function RuleForm({
  formData,
  categories,
  editingRule,
  loading,
  onFieldChange,
  onSave,
  onClose,
}: RuleFormProps) {
  const isEditing = !!editingRule;
  const needsAmount = formData.type === 'amount' || formData.type === 'composite';
  const needsKeyword = formData.type !== 'amount' && formData.type !== 'fallback';
  const confidence = CONFIDENCE_MAP[formData.type];

  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.id === formData.category_id) || null,
    [categories, formData.category_id]
  );
  const [categoryQuery, setCategoryQuery] = useState(selectedCategory?.name || '');

  useEffect(() => {
    setCategoryQuery(selectedCategory?.name || '');
  }, [selectedCategory?.id, selectedCategory?.name]);

  const matchingCategory = useMemo(
    () => categories.find((cat) => cat.name.toLowerCase() === categoryQuery.trim().toLowerCase()) || null,
    [categories, categoryQuery]
  );

  const isValid =
    !!formData.category_id &&
    formData.priority > 0 &&
    (needsKeyword ? formData.keyword.trim() : true);

  let regexError: string | null = null;
  if (formData.type === 'regex' && formData.keyword) {
    try {
      new RegExp(formData.keyword, 'i');
    } catch (e: any) {
      regexError = e.message;
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-800">{isEditing ? 'Chỉnh sửa Quy tắc' : 'Tạo Quy tắc mới'}</h3>
        <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Loại quy tắc *</label>
            <select
              value={formData.type}
              onChange={(e) => onFieldChange('type', e.target.value as RuleFormData['type'])}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {RULE_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} - {t.description}
                </option>
              ))}
            </select>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
              Confidence:
              <span
                className={clsx(
                  'font-bold',
                  confidence >= 0.85 ? 'text-green-600' : confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                )}
              >
                {Math.round(confidence * 100)}%
              </span>
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Ưu tiên * (nhỏ = cao)</label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => onFieldChange('priority', parseInt(e.target.value, 10) || 0)}
              min={1}
              max={999}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Danh mục *</label>
            <input
              list="rule-category-options"
              value={categoryQuery}
              onChange={(e) => {
                const nextValue = e.target.value;
                setCategoryQuery(nextValue);
                const matched = categories.find((cat) => cat.name.toLowerCase() === nextValue.trim().toLowerCase());
                onFieldChange('category_id', matched?.id || '');
              }}
              placeholder="Gõ tên danh mục..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="rule-category-options">
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name} />
              ))}
            </datalist>
            {!matchingCategory && categoryQuery.trim() !== '' ? (
              <p className="mt-1 text-[10px] text-amber-600">Cần chọn đúng tên danh mục trong danh sách gợi ý.</p>
            ) : null}
          </div>
        </div>

        {needsKeyword && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {formData.type === 'regex'
                ? 'Regex pattern *'
                : formData.type === 'exact'
                  ? 'Chuỗi khớp chính xác *'
                  : 'Từ khoá * (dùng | để tách)'}
            </label>
            <input
              type="text"
              value={formData.keyword}
              onChange={(e) => onFieldChange('keyword', e.target.value)}
              placeholder={
                formData.type === 'regex'
                  ? 'thanh\\s+toan.*don\\s+hang'
                  : formData.type === 'exact'
                    ? 'chuyen tien luong thang 3'
                    : 'chuyen tien|chuyen khoan|ck nhan'
              }
              className={clsx(
                'w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2',
                regexError ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-indigo-500'
              )}
            />
            {regexError ? <p className="mt-1 text-[10px] text-red-500">Regex không hợp lệ: {regexError}</p> : null}
            {formData.type === 'keyword' ? (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                <Info className="h-3 w-3" />
                Khớp trên chuỗi đã bỏ dấu tiếng Việt. Dùng | để tách nhiều từ khoá.
              </p>
            ) : null}
          </div>
        )}

        {needsAmount && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Số tiền tối thiểu</label>
              <input
                type="number"
                value={formData.amount_min}
                onChange={(e) => onFieldChange('amount_min', e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Số tiền tối đa</label>
              <input
                type="number"
                value={formData.amount_max}
                onChange={(e) => onFieldChange('amount_max', e.target.value)}
                placeholder="999999999"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={formData.stop_on_match}
              onChange={(e) => onFieldChange('stop_on_match', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Dừng khi khớp</span>
            <span className="text-[10px] text-gray-400">(dừng khi khớp quy tắc này)</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => onFieldChange('is_active', e.target.checked)}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Hoạt động</span>
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 pt-2">
          <button
            onClick={onSave}
            disabled={loading || !isValid || !!regexError}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditing ? 'Cập nhật' : 'Tạo quy tắc'}
          </button>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100">
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
}
