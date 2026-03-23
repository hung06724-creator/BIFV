import { RefreshCw, StickyNote, Clock } from 'lucide-react';
import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { DashboardStats } from './types';
import type { TransactionListItem } from '@/components/features/transactions/types';
import clsx from 'clsx';

const VN = new Intl.NumberFormat('vi-VN');

// ─── Noted Transactions Panel ─────────────────────────────────────────────────
function NotedTransactionsPanel({ transactions }: { transactions: (TransactionListItem & { bank: string })[] }) {
  if (transactions.length === 0) return null;

  return (
    <div className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border-b border-amber-200">
        <StickyNote className="w-4 h-4 text-amber-600" />
        <h2 className="text-sm font-semibold text-amber-800">Giao dịch có ghi chú</h2>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
          {transactions.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Ngân hàng</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Thời gian</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Số tiền</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Ghi chú</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nội dung giao dịch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-amber-50/40 transition-colors">
                <td className="px-4 py-2.5">
                  <span className={clsx(
                    'inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                    t.bank === 'BIDV' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  )}>
                    {t.bank}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{t.raw_date}</td>
                <td className={clsx(
                  'px-4 py-2.5 text-xs font-semibold text-right tabular-nums whitespace-nowrap',
                  t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                )}>
                  {t.type === 'credit' ? '+' : '-'}{VN.format(t.normalized_amount)}
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-block bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 text-xs text-amber-800 max-w-[280px] break-words">
                    {t.notes}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[300px] truncate" title={t.raw_desc}>
                  {t.raw_desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Unclassified Transactions Panel ──────────────────────────────────────────
function UnclassifiedTransactionsPanel({ transactions }: { transactions: (TransactionListItem & { bank: string })[] }) {
  if (transactions.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-6">
      <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200">
        <Clock className="w-4 h-4 text-gray-600" />
        <h2 className="text-sm font-semibold text-gray-800">Giao dịch tiền vào chưa được phân loại</h2>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
          {transactions.length}
        </span>
      </div>
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Ngân hàng</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Thời gian</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Số tiền</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Nội dung giao dịch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5">
                  <span className={clsx(
                    'inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                    t.bank === 'BIDV' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  )}>
                    {t.bank}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{t.raw_date}</td>
                <td className={clsx(
                  'px-4 py-2.5 text-xs font-semibold text-right tabular-nums whitespace-nowrap',
                  t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                )}>
                  {t.type === 'credit' ? '+' : '-'}{VN.format(t.normalized_amount)}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[400px]" title={t.raw_desc}>
                  {t.raw_desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardView() {
  const bidv = useAppStore((s) => s.bidvTransactions);
  const agri = useAppStore((s) => s.agribankTransactions);
  const transactions = [...bidv, ...agri];

  const stats = useMemo<DashboardStats>(() => {
    const total = transactions.length;
    const totalCredit = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.normalized_amount, 0);
    const totalDebit = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.normalized_amount, 0);

    const byStatus = {
      pending_classification: transactions.filter((t) => t.status === 'pending_classification').length,
      classified: transactions.filter((t) => t.status === 'classified').length,
      confirmed: transactions.filter((t) => t.status === 'confirmed').length,
      exported: transactions.filter((t) => t.status === 'exported').length,
      matched: transactions.filter((t) => t.status === 'matched').length,
      mismatched: transactions.filter((t) => t.status === 'mismatched').length,
    };

    return {
      total_transactions: total,
      total_credit: totalCredit,
      total_debit: totalDebit,
      net_amount: totalCredit - totalDebit,
      by_status: byStatus,
      unresolved: byStatus.pending_classification + byStatus.classified,
      pending_review: byStatus.classified,
      confirmed: byStatus.confirmed,
    };
  }, [transactions]);

  const notedTransactions = useMemo(() => [
    ...bidv.filter((t) => t.notes?.trim()).map((t) => ({ ...t, bank: 'BIDV' })),
    ...agri.filter((t) => t.notes?.trim()).map((t) => ({ ...t, bank: 'AGRIBANK' })),
  ].sort((a, b) => b.normalized_date.localeCompare(a.normalized_date)), [bidv, agri]);

  const unclassifiedTransactions = useMemo(() => [
    ...bidv.filter((t) => t.status === 'pending_classification' && t.type === 'credit').map((t) => ({ ...t, bank: 'BIDV' })),
    ...agri.filter((t) => t.status === 'pending_classification' && t.type === 'credit').map((t) => ({ ...t, bank: 'AGRIBANK' })),
  ].sort((a, b) => b.normalized_date.localeCompare(a.normalized_date)), [bidv, agri]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tổng quan tình trạng xử lý sổ phụ ngân hàng
          </p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">Chưa có dữ liệu. Hãy nhập sổ phụ ngân hàng trước.</p>
        </div>
      ) : (
        <>
          <UnclassifiedTransactionsPanel transactions={unclassifiedTransactions} />
          <NotedTransactionsPanel transactions={notedTransactions} />
        </>
      )}
    </div>
  );
}
