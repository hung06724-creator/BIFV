import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppStore, type BankTab } from '@/lib/store';
import type { TransactionListItem } from '@/components/features/transactions/types';

const VN = new Intl.NumberFormat('vi-VN');

const BANK_TABS: { key: BankTab; label: string }[] = [
  { key: 'BIDV', label: 'BIDV' },
  { key: 'AGRIBANK', label: 'Agribank' },
];

interface MonthGroup {
  key: string;       // "2026-03"
  label: string;     // "Tháng 03/2026"
  transactions: TransactionListItem[];
  totalCredit: number;
  totalDebit: number;
  count: number;
}

function groupByMonth(transactions: TransactionListItem[]): MonthGroup[] {
  const map = new Map<string, TransactionListItem[]>();

  for (const t of transactions) {
    // normalized_date = "YYYY-MM-DD"
    const monthKey = t.normalized_date.substring(0, 7); // "YYYY-MM"
    if (!monthKey || monthKey.length < 7) continue;
    const arr = map.get(monthKey) || [];
    arr.push(t);
    map.set(monthKey, arr);
  }

  // Sort months descending (newest first)
  const sorted = [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return sorted.map(([key, txns]) => {
    const [year, month] = key.split('-');
    return {
      key,
      label: `Tháng ${month}/${year}`,
      transactions: txns.sort((a, b) => b.raw_date.localeCompare(a.raw_date)),
      totalCredit: txns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.normalized_amount, 0),
      totalDebit: txns.filter((t) => t.type === 'debit').reduce((s, t) => s + t.normalized_amount, 0),
      count: txns.length,
    };
  });
}

export function TransactionHistory() {
  const bidv = useAppStore((s) => s.bidvTransactions);
  const agri = useAppStore((s) => s.agribankTransactions);
  const [activeBank, setActiveBank] = useState<BankTab>('BIDV');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const transactions = activeBank === 'BIDV' ? bidv : agri;
  const months = useMemo(() => groupByMonth(transactions), [transactions]);

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const bankCounts = { BIDV: bidv.length, AGRIBANK: agri.length };

  return (
    <div className="space-y-4">
      {/* Bank tabs */}
      <div className="flex gap-2">
        {BANK_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveBank(tab.key); setExpandedMonths(new Set()); }}
            className={clsx(
              'px-5 py-2 text-sm font-medium rounded-lg border transition-colors',
              activeBank === tab.key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            {tab.label}
            <span className={clsx(
              'ml-2 px-1.5 py-0.5 text-xs rounded-full font-bold',
              activeBank === tab.key ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
            )}>
              {bankCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {months.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">Chưa có dữ liệu {activeBank}. Hãy Import sổ phụ trước.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((month) => {
            const isExpanded = expandedMonths.has(month.key);
            return (
              <div key={month.key} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Month header */}
                <button
                  onClick={() => toggleMonth(month.key)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded
                      ? <ChevronDown className="w-5 h-5 text-gray-400" />
                      : <ChevronRight className="w-5 h-5 text-gray-400" />
                    }
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-gray-800">{month.label}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {month.count} giao dịch
                    </span>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                      <span className="font-mono font-semibold text-green-600">{VN.format(month.totalCredit)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                      <span className="font-mono font-semibold text-red-600">{VN.format(month.totalDebit)}</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-gray-700">
                      Ròng: <span className={month.totalCredit - month.totalDebit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {VN.format(month.totalCredit - month.totalDebit)}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Transactions table */}
                {isExpanded && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-10">#</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Thời gian</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Tiền ra</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Tiền vào</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-[40%]">Nội dung</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {month.transactions.map((t, idx) => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-xs text-gray-400 font-mono">{idx + 1}</td>
                            <td className="px-4 py-2 text-xs text-gray-700 whitespace-nowrap">{t.raw_date}</td>
                            <td className="px-4 py-2 text-xs text-right font-mono">
                              {t.debit_amount > 0
                                ? <span className="text-red-600 font-medium">{VN.format(t.debit_amount)}</span>
                                : <span className="text-gray-300">—</span>
                              }
                            </td>
                            <td className="px-4 py-2 text-xs text-right font-mono">
                              {t.credit_amount > 0
                                ? <span className="text-green-600 font-medium">{VN.format(t.credit_amount)}</span>
                                : <span className="text-gray-300">—</span>
                              }
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-700 truncate max-w-[400px]" title={t.raw_desc}>
                              {t.raw_desc}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
