import { useState } from 'react';
import { CheckCheck, Tag, ThumbsUp, ThumbsDown, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { CategoryOption } from './types';

interface BulkActionsProps {
  selectedCount: number;
  categories: CategoryOption[];
  loading: boolean;
  onAssignCategory: (categoryId: string) => void;
  onChangeReviewStatus: (status: 'approved' | 'rejected') => void;
  onConfirm: () => void;
  onClearSelection: () => void;
}

export function BulkActions({
  selectedCount,
  categories,
  loading,
  onAssignCategory,
  onChangeReviewStatus,
  onConfirm,
  onClearSelection,
}: BulkActionsProps) {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-20">
      <div className="mx-auto max-w-4xl bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-gray-700">
          <span className="flex items-center justify-center w-6 h-6 bg-indigo-500 rounded-full text-xs font-bold">
            {selectedCount}
          </span>
          <span className="text-sm text-gray-300">đã chọn</span>
        </div>

        {/* Assign Category */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Tag className="w-3.5 h-3.5" />
            Gán đầu mục
          </button>

          {showCategoryPicker && (
            <div className="absolute bottom-full mb-2 left-0 w-64 bg-white text-gray-900 rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    onAssignCategory(cat.id);
                    setShowCategoryPicker(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-gray-50 last:border-0"
                >
                  <span className="font-mono text-xs text-gray-400 mr-1.5">{cat.code}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Confirm selected */}
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
          Xác nhận
        </button>

        {/* Approve */}
        <button
          onClick={() => onChangeReviewStatus('approved')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          Duyệt
        </button>

        {/* Reject */}
        <button
          onClick={() => onChangeReviewStatus('rejected')}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-800 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          Từ chối
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clear selection */}
        <button
          onClick={() => {
            onClearSelection();
            setShowCategoryPicker(false);
          }}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Bỏ chọn
        </button>
      </div>
    </div>
  );
}
