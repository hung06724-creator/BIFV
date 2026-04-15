import { StickyNote, Clock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { TransactionListItem } from '@/components/features/transactions/types';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { getInvoiceEligibleAmount, isInvoiceEligibleTransaction } from '@/lib/invoice';

const VN = new Intl.NumberFormat('vi-VN');

type DashboardBankFilter = 'ALL' | 'BIDV' | 'AGRIBANK';

const DASHBOARD_BANK_BUTTONS: { key: DashboardBankFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'BIDV', label: 'BIDV' },
  { key: 'AGRIBANK', label: 'AGRIBANK' },
];

function getDashboardBankButtonStyle(activeBank: DashboardBankFilter, buttonBank: DashboardBankFilter) {
  if (activeBank !== buttonBank) {
    return {
      backgroundColor: '#ffffff',
      borderColor: 'var(--border)',
      color: 'var(--text-main)',
    };
  }

  if (buttonBank === 'AGRIBANK') {
    return {
      backgroundColor: 'var(--agribank)',
      borderColor: 'var(--agribank)',
      color: '#ffffff',
    };
  }

  if (buttonBank === 'BIDV') {
    return {
      backgroundColor: 'var(--primary)',
      borderColor: 'var(--primary)',
      color: '#ffffff',
    };
  }

  return {
    backgroundColor: 'var(--btn-secondary-bg)',
    borderColor: 'var(--btn-secondary-border)',
    color: 'var(--btn-secondary-text)',
  };
}

function inferBank(transactionId: string, bidvIds: Set<string>): 'BIDV' | 'AGRIBANK' {
  return bidvIds.has(transactionId) ? 'BIDV' : 'AGRIBANK';
}

function InvoiceSummaryPanel({
  issuedCount,
  issuedAmount,
  pendingCount,
  pendingAmount,
  selectedBank,
  setSelectedBank,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  availableYears,
}: {
  issuedCount: number;
  issuedAmount: number;
  pendingCount: number;
  pendingAmount: number;
  selectedBank: DashboardBankFilter;
  setSelectedBank: (bank: DashboardBankFilter) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  availableYears: number[];
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Sổ</label>
            <div className="flex flex-wrap items-center gap-2">
              {DASHBOARD_BANK_BUTTONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedBank(option.key)}
                  className="btn btn-md"
                  style={getDashboardBankButtonStyle(selectedBank, option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Tháng</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={month}>
                  Tháng {month}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Năm</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Đã xuất hóa đơn</p>
              <p className="mt-2 text-3xl font-bold font-mono text-emerald-700">{VN.format(issuedCount)}</p>
            </div>
            <div className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {VN.format(issuedAmount)} đ
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Số giao dịch thuộc nhóm doanh thu đào tạo và dịch vụ đã được đánh dấu xuất hóa đơn.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Chưa xuất hóa đơn</p>
              <p className="mt-2 text-3xl font-bold font-mono text-amber-700">{VN.format(pendingCount)}</p>
            </div>
            <div className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              {VN.format(pendingAmount)} đ
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Các giao dịch đủ điều kiện xuất hóa đơn nhưng chưa được tích xác nhận ở tab Giao dịch.
          </p>
        </div>
      </div>
    </div>
  );
}

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
                  <span
                    className={clsx(
                      'inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                      t.bank === 'BIDV' ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'bg-[var(--agribank-light)] text-[var(--agribank)]',
                    )}
                  >
                    {t.bank}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{t.raw_date}</td>
                <td
                  className={clsx(
                    'px-4 py-2.5 text-xs font-semibold text-right tabular-nums whitespace-nowrap',
                    t.type === 'credit' ? 'text-green-600' : 'text-red-600',
                  )}
                >
                  {t.type === 'credit' ? '+' : '-'}
                  {VN.format(t.normalized_amount)}
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-block bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 text-xs text-amber-800 max-w-[280px] break-words">
                    {t.notes}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[300px] truncate" title={t.raw_desc}>
                  <Link
                    to={`/transactions/${t.id}?focus=classification&bank=${t.bank}`}
                    className="text-indigo-700 hover:text-indigo-800 hover:underline"
                  >
                    {t.raw_desc}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
                  <span
                    className={clsx(
                      'inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                      t.bank === 'BIDV' ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'bg-[var(--agribank-light)] text-[var(--agribank)]',
                    )}
                  >
                    {t.bank}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{t.raw_date}</td>
                <td
                  className={clsx(
                    'px-4 py-2.5 text-xs font-semibold text-right tabular-nums whitespace-nowrap',
                    t.type === 'credit' ? 'text-green-600' : 'text-red-600',
                  )}
                >
                  {t.type === 'credit' ? '+' : '-'}
                  {VN.format(t.normalized_amount)}
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

export function DashboardView() {
  const bidv = useAppStore((s) => s.bidvTransactions);
  const agri = useAppStore((s) => s.agribankTransactions);
  const categories = useAppStore((s) => s.categories);
  const transactions = [...bidv, ...agri];
  const bidvIds = useMemo(() => new Set(bidv.map((transaction) => transaction.id)), [bidv]);
  const currentDate = new Date();

  const [selectedBank, setSelectedBank] = useState<DashboardBankFilter>('ALL');
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const transaction of transactions) {
      const year = Number.parseInt(transaction.normalized_date.substring(0, 4), 10);
      if (!Number.isNaN(year)) years.add(year);
    }
    const sorted = [...years].sort((a, b) => b - a);
    return sorted.length > 0 ? sorted : [currentDate.getFullYear()];
  }, [transactions, currentDate]);

  const invoiceSummary = useMemo(() => {
    const eligible = transactions.filter((transaction) => {
      if (transaction.type !== 'credit') return false;
      if (!isInvoiceEligibleTransaction(transaction, categories)) return false;

      const txnYear = Number.parseInt(transaction.normalized_date.substring(0, 4), 10);
      const txnMonth = Number.parseInt(transaction.normalized_date.substring(5, 7), 10);
      if (txnYear !== selectedYear || txnMonth !== selectedMonth) return false;

      if (selectedBank !== 'ALL') {
        const bank = inferBank(transaction.id, bidvIds);
        if (bank !== selectedBank) return false;
      }

      return true;
    });

    const issued = eligible.filter((transaction) => transaction.invoice_issued === true);
    const pending = eligible.filter((transaction) => transaction.invoice_issued !== true);

    return {
      issuedCount: issued.length,
      issuedAmount: issued.reduce((sum, transaction) => sum + getInvoiceEligibleAmount(transaction, categories), 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, transaction) => sum + getInvoiceEligibleAmount(transaction, categories), 0),
    };
  }, [transactions, categories, selectedBank, selectedMonth, selectedYear, bidvIds]);

  const notedTransactions = useMemo(
    () =>
      [
        ...bidv.filter((t) => t.notes?.trim()).map((t) => ({ ...t, bank: 'BIDV' })),
        ...agri.filter((t) => t.notes?.trim()).map((t) => ({ ...t, bank: 'AGRIBANK' })),
      ].sort((a, b) => b.normalized_date.localeCompare(a.normalized_date)),
    [bidv, agri],
  );

  const unclassifiedTransactions = useMemo(
    () =>
      [
        ...bidv.filter((t) => t.status === 'pending_classification' && t.type === 'credit').map((t) => ({ ...t, bank: 'BIDV' })),
        ...agri.filter((t) => t.status === 'pending_classification' && t.type === 'credit').map((t) => ({ ...t, bank: 'AGRIBANK' })),
      ].sort((a, b) => b.normalized_date.localeCompare(a.normalized_date)),
    [bidv, agri],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tổng quan tình trạng xử lý sổ phụ ngân hàng</p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">Chưa có dữ liệu. Hãy nhập sổ phụ ngân hàng trước.</p>
        </div>
      ) : (
        <>
          <InvoiceSummaryPanel
            {...invoiceSummary}
            selectedBank={selectedBank}
            setSelectedBank={setSelectedBank}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            availableYears={availableYears}
          />
          <UnclassifiedTransactionsPanel transactions={unclassifiedTransactions} />
          <NotedTransactionsPanel transactions={notedTransactions} />
        </>
      )}
    </div>
  );
}
