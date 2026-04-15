import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Plus, Trash2, Copy, Save, StickyNote, X, Pencil } from 'lucide-react';
import { InlineCategorySearch } from '@/components/shared/InlineCategorySearch';
import type { TransactionAllocationView, TransactionValidationState } from '../types';

interface ClassificationPanelProps {
  categories: { id: string; code: string; name: string }[];
  splitMode: 'direct' | 'horizontal' | 'vertical';
  allocations: TransactionAllocationView[];
  validation: TransactionValidationState;
  onAllocationChange: (
    allocationNo: number,
    patch: Partial<Pick<TransactionAllocationView, 'amount' | 'beneficiary_name' | 'beneficiary_code' | 'notes'>>,
    categoryId?: string | null
  ) => void;
  onAddAllocation: () => void;
  onRemoveAllocation: (allocationNo: number) => void;
  onCopyAllocations?: () => void;
  onSave?: (note: string) => void;
  onDeleteNote?: () => void;
  onAdjustRemaining?: (targetCategoryCode: string) => void;
  initialNote?: string | null;
}

const VN_NUMBER = new Intl.NumberFormat('vi-VN');

function StatusBadge({ status }: { status: TransactionAllocationView['status'] }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
        status === 'confirmed'
          ? 'bg-green-100 text-green-700'
          : status === 'classified'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-600'
      )}
    >
      {status === 'confirmed' ? 'Đã xác nhận' : status === 'classified' ? 'Đã phân loại' : 'Nháp'}
    </span>
  );
}

export function ClassificationPanel({
  categories,
  splitMode,
  allocations,
  validation,
  onAllocationChange,
  onAddAllocation,
  onRemoveAllocation,
  onCopyAllocations,
  onSave,
  onDeleteNote,
  onAdjustRemaining,
  initialNote,
}: ClassificationPanelProps) {
  const [note, setNote] = useState(initialNote ?? '');
  const [editing, setEditing] = useState(!initialNote);

  // Sync when initialNote changes (e.g. popup reopened for the same transaction)
  useEffect(() => {
    setNote(initialNote ?? '');
    setEditing(!initialNote);
  }, [initialNote]);

  const helperText = useMemo(() => {
    if (!validation.is_balanced) return 'Tổng số tiền phân bổ phải bằng số tiền giao dịch.';
    if (validation.has_unconfirmed_allocations) return 'Mỗi phân bổ phải có danh mục xác nhận.';
    if (validation.has_missing_beneficiaries) return 'Mỗi phân bổ dọc phải có người thụ hưởng rõ ràng.';
    return 'Phân bổ đã hợp lệ.';
  }, [validation]);

  return (
    <div className="space-y-5">
      {/* ─── Validation summary ─── */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            <strong>Kiểu phân bổ:</strong> {splitMode}
          </span>
          <span>
            <strong>Đã phân bổ:</strong> {VN_NUMBER.format(validation.total_allocated)}
          </span>
          <span className={clsx('inline-flex items-center gap-1.5', validation.remaining_amount === 0 ? 'text-green-700' : 'text-red-600')}>
            <strong>Còn lại:</strong> {VN_NUMBER.format(validation.remaining_amount)}
            {onAdjustRemaining && validation.remaining_amount !== 0 && (
              <>
                <button
                  type="button"
                  onClick={() => onAdjustRemaining('BAO_HIEM_YT')}
                  className="ml-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100"
                  title="Cộng/trừ phần dư vào BHYT"
                >
                  ± BHYT
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustRemaining('VAN_THE')}
                  className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100"
                  title="Cộng/trừ phần dư vào Văn thể"
                >
                  ± Văn thể
                </button>
              </>
            )}
          </span>
        </div>
        <p className="mt-2">{helperText}</p>
      </div>

      {/* ─── Allocation table ─── */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">STT</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Kiểu</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Số tiền</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Danh mục</th>
              {splitMode === 'vertical' && (
                <th className="px-3 py-2 text-left font-medium text-gray-500">Người thụ hưởng</th>
              )}
              <th className="px-3 py-2 text-left font-medium text-gray-500">Trạng thái</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {allocations.map((allocation) => (
              <tr key={allocation.id} className="align-top">
                <td className="px-3 py-2 font-mono">{allocation.allocation_no}</td>
                <td className="px-3 py-2">{allocation.allocation_type}</td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    min={0}
                    value={allocation.amount}
                    onChange={(e) =>
                      onAllocationChange(allocation.allocation_no, {
                        amount: Number.parseInt(e.target.value || '0', 10) || 0,
                      })
                    }
                    className="w-28 rounded-md border border-gray-200 px-2 py-1 text-right font-mono"
                  />
                </td>
                <td className="px-3 py-2">
                  {(() => {
                    const catId = allocation.confirmed_category_id || allocation.suggested_category_id || '';
                    const cat = categories.find((c) => c.id === catId);
                    return (
                      <InlineCategorySearch
                        currentName={cat?.name || null}
                        currentCode={cat?.code || null}
                        categories={categories}
                        onSelect={(categoryId) => onAllocationChange(allocation.allocation_no, {}, categoryId)}
                        transactionId={`alloc-${allocation.allocation_no}`}
                        shouldAutoActivate={false}
                        containerClassName="w-full"
                        forceUpward={true}
                      />
                    );
                  })()}
                </td>
                {splitMode === 'vertical' && (
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={allocation.beneficiary_name || ''}
                      onChange={(e) =>
                        onAllocationChange(allocation.allocation_no, {
                          beneficiary_name: e.target.value,
                        })
                      }
                      placeholder="Nhập người thụ hưởng"
                      className="w-full rounded-md border border-gray-200 px-2 py-1"
                    />
                  </td>
                )}
                <td className="px-3 py-2">
                  <StatusBadge status={allocation.status} />
                </td>
                <td className="px-3 py-2 text-center">
                  {allocations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveAllocation(allocation.allocation_no)}
                      className="inline-flex items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Xóa phân bổ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        {/* ─── Add / Copy buttons ─── */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddAllocation}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm phân bổ mới
          </button>
          {onCopyAllocations && splitMode === 'horizontal' && (
            <button
              type="button"
              onClick={onCopyAllocations}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 px-4 py-2 text-xs font-medium text-indigo-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <Copy className="h-3.5 w-3.5" />
              Sao chép từ GD đã xác nhận
            </button>
          )}
        </div>

        {/* ─── Sticky note section ─── */}
        {onSave && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-amber-800">Ghi chú giao dịch</span>
              {initialNote && !editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="ml-auto flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 transition-colors"
                >
                  <Pencil className="h-3 w-3" /> Sửa
                </button>
              )}
              {initialNote && (
                <button
                  type="button"
                  onClick={() => {
                    setNote('');
                    setEditing(true);
                    onDeleteNote?.();
                  }}
                  className={clsx(
                    'flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors',
                    !editing && 'ml-2'
                  )}
                  title="Xóa ghi chú"
                >
                  <X className="h-3 w-3" /> Xóa
                </button>
              )}
            </div>

            {/* Display saved note (read-only) */}
            {initialNote && !editing && (
              <div className="bg-white border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 whitespace-pre-wrap break-words">
                {initialNote}
              </div>
            )}

            {/* Textarea for editing / creating */}
            {editing && (
              <>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập ghi chú cho giao dịch này (vd: mai phải xử lý giao dịch này)..."
                  rows={3}
                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                  autoFocus
                />
                <div className="flex items-center">
                  {initialNote && (
                    <button
                      type="button"
                      onClick={() => { setNote(initialNote); setEditing(false); }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onSave(note);
                      if (note.trim()) setEditing(false);
                    }}
                    className="ml-auto flex items-center gap-1.5 rounded-lg bg-amber-500 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Lưu ghi chú
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
