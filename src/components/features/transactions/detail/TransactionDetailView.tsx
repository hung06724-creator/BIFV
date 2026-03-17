import {
  Loader2,
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  FileOutput,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useState, useCallback } from 'react';
import { useTransactionDetail } from './useTransactionDetail';
import { ClassificationPanel } from './ClassificationPanel';
import { CopyAllocationModal } from './CopyAllocationModal';

interface TransactionDetailViewProps {
  transactionId: string;
  variant?: 'page' | 'modal';
  onClose?: () => void;
}

const VN_NUMBER = new Intl.NumberFormat('vi-VN');

export function TransactionDetailView({
  transactionId,
  variant = 'page',
  onClose,
}: TransactionDetailViewProps) {
  const { transaction, categories, loading, error, updateAllocation, addAllocation, removeAllocation, copyAllocationsFrom, confirmAllocations } = useTransactionDetail(transactionId);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const isModal = variant === 'modal';

  if (error) {
    return (
      <div className="flex items-center rounded-lg bg-red-50 p-4 text-red-600">
        <AlertCircle className="mr-3 h-5 w-5 flex-shrink-0" />
        {error}
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-500">Đang tải dữ liệu giao dịch...</span>
      </div>
    );
  }

  const statusConfig = {
    pending_classification: { label: 'Chờ phân loại', icon: Clock, cls: 'bg-gray-100 text-gray-600' },
    classified: { label: 'Đã phân loại', icon: HelpCircle, cls: 'bg-blue-100 text-blue-700' },
    confirmed: { label: 'Đã xác nhận', icon: Check, cls: 'bg-green-100 text-green-700' },
    exported: { label: 'Đã xuất', icon: FileOutput, cls: 'bg-purple-100 text-purple-700' },
    matched: { label: 'Đã khớp', icon: CheckCircle2, cls: 'bg-green-100 text-green-700' },
    mismatched: { label: 'Sai sót', icon: AlertCircle, cls: 'bg-red-100 text-red-600' },
  }[transaction.status];

  const StatusIcon = statusConfig.icon;

  const adjustRemaining = useCallback(
    (targetCategoryCode: string) => {
      const remaining = transaction.validation.remaining_amount;
      if (remaining === 0) return;

      const target = transaction.allocations.find(
        (a) =>
          (a.confirmed_category_code === targetCategoryCode || a.suggested_category_code === targetCategoryCode)
      );
      if (!target) return;

      updateAllocation(target.allocation_no, { amount: target.amount + remaining });
    },
    [transaction, updateAllocation]
  );

  return (
    <div className={clsx('space-y-5', isModal && 'max-h-[80vh] overflow-y-auto pr-1')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">
              {isModal ? 'Xem phân bổ' : 'Chi tiết giao dịch'}
            </h1>
            <span
              className={clsx(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                statusConfig.cls
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="font-mono">{transaction.id}</span>
            <span>|</span>
            <span className="uppercase">{transaction.split_mode}</span>
            <span>|</span>
            <span>{transaction.raw_date}</span>
            <span>|</span>
            <span
              className={clsx(
                'font-semibold',
                transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {transaction.type === 'debit' ? '-' : '+'}
              {VN_NUMBER.format(transaction.normalized_amount)} d
            </span>
          </div>
        </div>
        {isModal && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Người chuyển</p>
        <p className="mt-2 text-lg font-semibold text-gray-900">
          {transaction.parsed.sender_name || transaction.parsed.transfer_ref || 'Chưa xác định'}
        </p>
      </div>

      <ClassificationPanel
        categories={categories}
        splitMode={transaction.split_mode}
        allocations={transaction.allocations}
        validation={transaction.validation}
        onAllocationChange={updateAllocation}
        onAddAllocation={addAllocation}
        onRemoveAllocation={removeAllocation}
        onCopyAllocations={transaction.split_mode === 'horizontal' ? () => setShowCopyModal(true) : undefined}
        onSave={() => confirmAllocations('')}
        onAdjustRemaining={transaction.split_mode !== 'direct' ? adjustRemaining : undefined}
      />

      {showCopyModal && (
        <CopyAllocationModal
          currentTransactionId={transaction.id}
          currentAmount={transaction.normalized_amount}
          onSelect={copyAllocationsFrom}
          onClose={() => setShowCopyModal(false)}
        />
      )}

      {loading && (
        <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Đang cập nhật phân bổ...
        </div>
      )}
    </div>
  );
}
