import { Check, AlertTriangle, FileOutput, Clock, HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import type { TransactionListItem, Pagination } from './types';

interface TransactionTableProps {
  transactions: TransactionListItem[];
  pagination: Pagination;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onGoToPage: (page: number) => void;
}

const VN_NUMBER = new Intl.NumberFormat('vi-VN');

function formatAmount(amount: number): string {
  return VN_NUMBER.format(amount);
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <span
      className={clsx(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold',
        pct >= 85
          ? 'bg-green-100 text-green-700'
          : pct >= 50
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
      )}
    >
      {pct}%
    </span>
  );
}

function StatusBadge({ status }: { status: TransactionListItem['status'] }) {
  const config = {
    pending_classification: { label: 'Chờ phân loại', icon: Clock, cls: 'bg-gray-100 text-gray-600' },
    classified: { label: 'Đã phân loại', icon: HelpCircle, cls: 'bg-blue-100 text-blue-700' },
    confirmed: { label: 'Đã xác nhận', icon: Check, cls: 'bg-green-100 text-green-700' },
    exported: { label: 'Đã xuất', icon: FileOutput, cls: 'bg-purple-100 text-purple-700' },
  }[status];

  const Icon = config.icon;

  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.cls)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function CategoryCell({
  name,
  code,
  isOverridden,
}: {
  name: string | null;
  code: string | null;
  isOverridden?: boolean;
}) {
  if (!name) {
    return <span className="text-gray-400 italic text-xs">—</span>;
  }
  return (
    <div className="flex items-center gap-1">
      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100 truncate max-w-[140px]" title={`${code} – ${name}`}>
        {name}
      </span>
      {isOverridden && (
        <span title="Đã override thủ công"><AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" /></span>
      )}
    </div>
  );
}

export function TransactionTable({
  transactions,
  pagination,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onGoToPage,
}: TransactionTableProps) {
  const allSelected = transactions.length > 0 && selectedIds.size === transactions.length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ngày</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mã GD</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ghi nợ</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ghi có</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Số dư</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[220px]">Mô tả</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Người chuyển</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Số tiền</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Gợi ý ĐM</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ĐM xác nhận</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Conf.</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Người xử lý</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-6 py-12 text-center text-gray-500">
                  Không có giao dịch nào khớp bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                const isSelected = selectedIds.has(t.id);
                const isApproved = t.match?.review_status === 'approved';

                return (
                  <tr
                    key={t.id}
                    className={clsx(
                      'hover:bg-gray-50 transition-colors',
                      isSelected && 'bg-indigo-50/50',
                      isApproved && !isSelected && 'bg-green-50/30'
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(t.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Ngày */}
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap text-xs font-medium">
                      {t.raw_date.split(' ')[0]}
                    </td>

                    {/* Mã GD */}
                    <td className="px-3 py-2.5 text-gray-500 font-mono text-xs truncate max-w-[100px]" title={t.raw_reference || ''}>
                      {t.raw_reference || '—'}
                    </td>

                    {/* Ghi nợ */}
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {t.debit_amount > 0 ? (
                        <span className="text-red-600">{formatAmount(t.debit_amount)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Ghi có */}
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {t.credit_amount > 0 ? (
                        <span className="text-green-600">{formatAmount(t.credit_amount)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Số dư */}
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-600">
                      {t.balance_after != null ? formatAmount(t.balance_after) : '—'}
                    </td>

                    {/* Mô tả */}
                    <td className="px-3 py-2.5">
                      <p className="text-xs text-gray-800 truncate max-w-[220px]" title={t.raw_desc || ''}>
                        {t.raw_desc}
                      </p>
                    </td>

                    {/* Người chuyển */}
                    <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">
                      {t.sender_name || <span className="text-gray-300">—</span>}
                    </td>

                    {/* Số tiền */}
                    <td className={clsx('px-3 py-2.5 text-right font-semibold text-xs font-mono', t.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                      {t.type === 'debit' ? '-' : '+'}{formatAmount(t.normalized_amount)}
                    </td>

                    {/* Gợi ý đầu mục */}
                    <td className="px-3 py-2.5">
                      <CategoryCell
                        name={t.match?.suggested_category_name || null}
                        code={t.match?.suggested_category_code || null}
                      />
                    </td>

                    {/* Đầu mục xác nhận */}
                    <td className="px-3 py-2.5">
                      <CategoryCell
                        name={t.match?.confirmed_category_name || null}
                        code={t.match?.confirmed_category_code || null}
                        isOverridden={t.match?.is_manually_overridden}
                      />
                    </td>

                    {/* Confidence */}
                    <td className="px-3 py-2.5 text-center">
                      {t.match ? <ConfidenceBadge score={t.match.confidence_score} /> : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Trạng thái */}
                    <td className="px-3 py-2.5 text-center">
                      <StatusBadge status={t.status} />
                    </td>

                    {/* Người xử lý */}
                    <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                      {t.match?.reviewer_name || <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-500">
            Hiển thị {(pagination.page - 1) * pagination.page_size + 1}–
            {Math.min(pagination.page * pagination.page_size, pagination.total_items)} / {pagination.total_items} giao dịch
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onGoToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 text-xs font-medium rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Trước
            </button>
            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
              .filter((p) => {
                if (pagination.total_pages <= 7) return true;
                if (p === 1 || p === pagination.total_pages) return true;
                return Math.abs(p - pagination.page) <= 1;
              })
              .map((p, idx, arr) => {
                const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                return (
                  <span key={p}>
                    {showEllipsis && <span className="px-1 text-gray-400 text-xs">…</span>}
                    <button
                      onClick={() => onGoToPage(p)}
                      className={clsx(
                        'px-2.5 py-1 text-xs font-medium rounded border',
                        p === pagination.page
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}
            <button
              onClick={() => onGoToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.total_pages}
              className="px-2.5 py-1 text-xs font-medium rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau →
            </button>
          </div>
        </div>
      )}

      {/* Footer summary for single page */}
      {pagination.total_pages <= 1 && pagination.total_items > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            Tổng cộng {pagination.total_items} giao dịch
          </p>
        </div>
      )}
    </div>
  );
}
