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

  const isValid =
    formData.category_id &&
    formData.priority > 0 &&
    (needsKeyword ? formData.keyword.trim() : true);

  // Validate regex
  let regexError: string | null = null;
  if (formData.type === 'regex' && formData.keyword) {
    try {
      new RegExp(formData.keyword, 'i');
    } catch (e: any) {
      regexError = e.message;
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          {isEditing ? 'Chỉnh sửa Rule' : 'Tạo Rule mới'}
        </h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Row 1: Type + Priority + Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Loại rule *</label>
            <select
              value={formData.type}
              onChange={(e) => onFieldChange('type', e.target.value as RuleFormData['type'])}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {RULE_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} – {t.description}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
              Confidence:
              <span className={clsx(
                'font-bold',
                confidence >= 0.85 ? 'text-green-600' : confidence >= 0.5 ? 'text-yellow-600' : 'text-red-600'
              )}>
                {Math.round(confidence * 100)}%
              </span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Priority * (nhỏ = cao)</label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => onFieldChange('priority', parseInt(e.target.value) || 0)}
              min={1}
              max={999}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
            <select
              value={formData.category_id}
              onChange={(e) => onFieldChange('category_id', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Chọn đầu mục —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.code} – {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Keyword/Pattern */}
        {needsKeyword && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {formData.type === 'regex' ? 'Regex pattern *' : formData.type === 'exact' ? 'Exact match string *' : 'Keywords * (dùng | để tách)'}
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
                'w-full text-sm border rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2',
                regexError
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-200 focus:ring-indigo-500'
              )}
            />
            {regexError && (
              <p className="text-[10px] text-red-500 mt-1">Regex không hợp lệ: {regexError}</p>
            )}
            {formData.type === 'keyword' && (
              <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Matching trên chuỗi đã bỏ dấu tiếng Việt (no-accent). Dùng | để tách nhiều từ khóa.
              </p>
            )}
          </div>
        )}

        {/* Row 3: Amount range */}
        {needsAmount && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Số tiền tối thiểu</label>
              <input
                type="number"
                value={formData.amount_min}
                onChange={(e) => onFieldChange('amount_min', e.target.value)}
                placeholder="0"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Số tiền tối đa</label>
              <input
                type="number"
                value={formData.amount_max}
                onChange={(e) => onFieldChange('amount_max', e.target.value)}
                placeholder="999999999"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Row 4: Toggles */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.stop_on_match}
              onChange={(e) => onFieldChange('stop_on_match', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Stop on match</span>
            <span className="text-[10px] text-gray-400">(dừng engine khi khớp rule này)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => onFieldChange('is_active', e.target.checked)}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={onSave}
            disabled={loading || !isValid || !!regexError}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditing ? 'Cập nhật' : 'Tạo Rule'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
}
