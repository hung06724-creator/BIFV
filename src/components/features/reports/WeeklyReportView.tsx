import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { BankTab } from '@/lib/store';
import { loadXLSX } from '@/lib/lazyVendors';

const WEEK_LABELS = ['Tuần 1 (1-8)', 'Tuần 2 (9-15)', 'Tuần 3 (16-22)', 'Tuần 4 (23-cuối)'];

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getWeekIndex(day: number, lastDay: number): number {
  if (day <= 8) return 0;
  if (day <= 15) return 1;
  if (day <= 22) return 2;
  if (day <= lastDay) return 3;
  return -1;
}

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN');
}

function formatWeeklyDisplayValue(value: number): string {
  return value === 0 ? '-' : formatNumber(value);
}

interface CategoryRow {
  code: string;
  name: string;
  ledgerAccount: string;
  weeks: [number, number, number, number];
  total: number;
}

const BANK_BUTTONS: { key: BankTab; label: string }[] = [
  { key: 'BIDV', label: 'BIDV' },
  { key: 'AGRIBANK', label: 'AGRIBANK' },
];

function getBankButtonStyle(activeBank: BankTab, buttonBank: BankTab) {
  const isActive = activeBank === buttonBank;
  const isAgribank = buttonBank === 'AGRIBANK';

  if (!isActive) {
    return {
      backgroundColor: '#ffffff',
      borderColor: 'var(--border)',
      color: 'var(--text-main)',
    };
  }

  return {
    backgroundColor: isAgribank ? 'var(--agribank)' : 'var(--primary)',
    borderColor: isAgribank ? 'var(--agribank)' : 'var(--primary)',
    color: '#ffffff',
  };
}

export function WeeklyReportView() {
  const currentDate = new Date();
  const [bank, setBank] = useState<BankTab>('AGRIBANK');
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const bidvTransactions = useAppStore((s) => s.bidvTransactions);
  const agribankTransactions = useAppStore((s) => s.agribankTransactions);
  const categories = useAppStore((s) => s.categories);

  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    const allTxns = [...bidvTransactions, ...agribankTransactions];
    for (const t of allTxns) {
      const y = parseInt(t.normalized_date.substring(0, 4), 10);
      if (!isNaN(y)) yearSet.add(y);
    }
    const years = [...yearSet].sort((a, b) => b - a);
    return years.length > 0 ? years : [new Date().getFullYear()];
  }, [bidvTransactions, agribankTransactions]);

  const rows = useMemo<CategoryRow[]>(() => {
    const transactions = bank === 'BIDV' ? bidvTransactions : agribankTransactions;
    const lastDay = getLastDayOfMonth(year, month);
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}-`;

    const categoryMap = new Map<string, { code: string; name: string; ledgerAccount: string }>();
    for (const cat of categories) {
      categoryMap.set(cat.code, {
        code: cat.code,
        name: cat.name,
        ledgerAccount: cat.ledger_account ?? '',
      });
    }

    const weekSums = new Map<string, [number, number, number, number]>();

    for (const txn of transactions) {
      if (!txn.normalized_date.startsWith(prefix)) continue;

      const day = parseInt(txn.normalized_date.substring(8, 10), 10);
      const weekIdx = getWeekIndex(day, lastDay);
      if (weekIdx < 0) continue;

      for (const alloc of txn.allocations) {
        const catCode = alloc.confirmed_category_code;
        if (!catCode) continue;

        if (!weekSums.has(catCode)) {
          weekSums.set(catCode, [0, 0, 0, 0]);
        }
        weekSums.get(catCode)![weekIdx] += alloc.amount;
      }
    }

    const result: CategoryRow[] = [];
    for (const [code, weeks] of weekSums) {
      const total = weeks[0] + weeks[1] + weeks[2] + weeks[3];
      const cat = categoryMap.get(code);
      result.push({
        code,
        name: cat?.name ?? code,
        ledgerAccount: cat?.ledgerAccount ?? '',
        weeks,
        total,
      });
    }

    result.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return result;
  }, [bank, month, year, bidvTransactions, agribankTransactions, categories]);

  const totals = useMemo(() => {
    const weeks: [number, number, number, number] = [0, 0, 0, 0];
    let total = 0;
    for (const row of rows) {
      for (let i = 0; i < 4; i++) weeks[i] += row.weeks[i];
      total += row.total;
    }
    return { weeks, total };
  }, [rows]);

  async function handleDownload() {
    const XLSX = await loadXLSX();
    const header = ['Tên danh mục', 'TK', ...WEEK_LABELS, 'Tổng cộng'];
    const data = rows.map((row) => [row.name, row.ledgerAccount, ...row.weeks, row.total]);
    data.push(['Tổng cộng', '', ...totals.weeks, totals.total]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo tuần');
    XLSX.writeFile(wb, `Bao-cao-tuan_${bank}_T${month}-${year}.xlsx`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo theo tuần</h1>
          <p className="mt-0.5 text-sm text-gray-500">Tổng hợp thu chi theo từng tuần trong tháng</p>
        </div>
        <button onClick={handleDownload} disabled={rows.length === 0} className="btn btn-md btn-primary">
          <Download className="w-4 h-4" />
          Tải Excel
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Ngân hàng</label>
            <div className="flex items-center gap-2">
              {BANK_BUTTONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setBank(option.key)}
                  className="btn btn-md"
                  style={getBankButtonStyle(bank, option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Tháng</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Năm</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-400">Không có dữ liệu cho {bank} tháng {month}/{year}.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Tên danh mục</th>
                  {WEEK_LABELS.map((label) => (
                    <th key={label} className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Tổng cộng</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.code} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.name}</div>
                      {row.ledgerAccount && <div className="mt-0.5 text-xs text-gray-400">TK {row.ledgerAccount}</div>}
                    </td>
                    {row.weeks.map((value, i) => (
                      <td key={i} className={`text-right px-4 py-3 tabular-nums ${value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatWeeklyDisplayValue(value)}
                      </td>
                    ))}
                    <td className={`text-right px-4 py-3 font-semibold tabular-nums ${row.total < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatWeeklyDisplayValue(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900">Tổng cộng</td>
                  {totals.weeks.map((value, i) => (
                    <td key={i} className={`text-right px-4 py-3 font-bold tabular-nums ${value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatWeeklyDisplayValue(value)}
                    </td>
                  ))}
                  <td className={`text-right px-4 py-3 font-bold tabular-nums ${totals.total < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatWeeklyDisplayValue(totals.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
