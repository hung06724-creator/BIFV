import { RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { StatsCards } from './StatsCards';
import { StatusBreakdown } from './StatusBreakdown';
import { useAppStore } from '@/lib/store';
import type { DashboardStats } from './types';

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
          <StatsCards stats={stats} />
          <StatusBreakdown stats={stats} />
        </>
      )}
    </div>
  );
}
