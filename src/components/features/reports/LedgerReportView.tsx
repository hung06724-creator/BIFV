import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Download } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { BankTab } from '@/lib/store';
import type { TransactionListItem } from '@/components/features/transactions/types';
import { loadXLSX } from '@/lib/lazyVendors';

type ViewMode = 'week' | 'month' | 'year';

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

interface CategoryEntry {
  code: string;
  name: string;
  values: number[];
  total: number;
}

interface LedgerGroup {
  ledgerAccount: string;
  categories: CategoryEntry[];
  values: number[];
  total: number;
}

const BANK_BUTTONS: { key: BankTab; label: string }[] = [
  { key: 'BIDV', label: 'BIDV' },
  { key: 'AGRIBANK', label: 'AGRIBANK' },
];

function buildColumnLabels(mode: ViewMode, month: number, year: number): string[] {
  if (mode === 'week') return WEEK_LABELS;
  if (mode === 'month') return Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);
  return [String(year)];
}

function getColumnIndex(mode: ViewMode, txn: TransactionListItem, selectedMonth: number, selectedYear: number): number {
  const day = parseInt(txn.normalized_date.substring(8, 10), 10);
  const txnMonth = parseInt(txn.normalized_date.substring(5, 7), 10);

  if (mode === 'week') {
    const lastDay = getLastDayOfMonth(selectedYear, selectedMonth);
    return getWeekIndex(day, lastDay);
  }
  if (mode === 'month') return txnMonth - 1;
  return 0;
}

function matchesRange(txn: TransactionListItem, mode: ViewMode, month: number, year: number): boolean {
  const y = parseInt(txn.normalized_date.substring(0, 4), 10);
  if (y !== year) return false;
  if (mode === 'week') {
    const m = parseInt(txn.normalized_date.substring(5, 7), 10);
    return m === month;
  }
  return true;
}

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

export function LedgerReportView() {
  const currentDate = new Date();
  const [bank, setBank] = useState<BankTab>('AGRIBANK');
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const bidvTransactions = useAppStore((s) => s.bidvTransactions);
  const agribankTransactions = useAppStore((s) => s.agribankTransactions);
  const categories = useAppStore((s) => s.categories);

  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    for (const t of [...bidvTransactions, ...agribankTransactions]) {
      const y = parseInt(t.normalized_date.substring(0, 4), 10);
      if (!isNaN(y)) yearSet.add(y);
    }
    const years = [...yearSet].sort((a, b) => b - a);
    return years.length > 0 ? years : [currentDate.getFullYear()];
  }, [bidvTransactions, agribankTransactions, currentDate]);

  const columnLabels = useMemo(() => buildColumnLabels(viewMode, month, year), [viewMode, month, year]);
  const colCount = columnLabels.length;

  const groups = useMemo<LedgerGroup[]>(() => {
    const transactions = bank === 'BIDV' ? bidvTransactions : agribankTransactions;
    const catMeta = new Map<string, { name: string; ledgerAccount: string }>();

    for (const cat of categories) {
      catMeta.set(cat.code, { name: cat.name, ledgerAccount: cat.ledger_account ?? '' });
    }

    const ledgerMap = new Map<string, Map<string, number[]>>();

    for (const txn of transactions) {
      if (!matchesRange(txn, viewMode, month, year)) continue;
      const colIdx = getColumnIndex(viewMode, txn, month, year);
      if (colIdx < 0) continue;

      for (const alloc of txn.allocations) {
        const catCode = alloc.confirmed_category_code;
        if (!catCode) continue;

        const meta = catMeta.get(catCode);
        const tk = meta?.ledgerAccount || '(Chưa gán TK)';

        if (!ledgerMap.has(tk)) ledgerMap.set(tk, new Map());
        const catMap = ledgerMap.get(tk)!;
        if (!catMap.has(catCode)) catMap.set(catCode, new Array(colCount).fill(0));
        catMap.get(catCode)![colIdx] += alloc.amount;
      }
    }

    const result: LedgerGroup[] = [];
    for (const [tk, catMap] of ledgerMap) {
      const cats: CategoryEntry[] = [];
      const groupValues = new Array(colCount).fill(0);
      let groupTotal = 0;

      for (const [code, values] of catMap) {
        const total = values.reduce((s, v) => s + v, 0);
        const meta = catMeta.get(code);
        cats.push({ code, name: meta?.name ?? code, values, total });
        for (let i = 0; i < colCount; i++) groupValues[i] += values[i];
        groupTotal += total;
      }

      cats.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      result.push({ ledgerAccount: tk, categories: cats, values: groupValues, total: groupTotal });
    }

    result.sort((a, b) => a.ledgerAccount.localeCompare(b.ledgerAccount));
    return result;
  }, [bank, viewMode, month, year, bidvTransactions, agribankTransactions, categories, colCount]);

  const grandTotals = useMemo(() => {
    const values = new Array(colCount).fill(0);
    let total = 0;
    for (const g of groups) {
      for (let i = 0; i < colCount; i++) values[i] += g.values[i];
      total += g.total;
    }
    return { values, total };
  }, [groups, colCount]);

  async function handleDownload() {
    const XLSX = await loadXLSX();
    const header = ['TK', 'Danh mục', ...columnLabels, 'Tổng cộng'];
    const data: Array<Array<string | number>> = [];

    for (const g of groups) {
      if (g.categories.length === 1) {
        const cat = g.categories[0];
        data.push([g.ledgerAccount, cat.name, ...cat.values, cat.total]);
      } else {
        for (const cat of g.categories) {
          data.push([g.ledgerAccount, cat.name, ...cat.values, cat.total]);
        }
        data.push([g.ledgerAccount, `** Cộng TK ${g.ledgerAccount}`, ...g.values, g.total]);
      }
    }
    data.push(['', 'TỔNG CỘNG', ...grandTotals.values, grandTotals.total]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo TK');
    const modeSuffix = viewMode === 'week' ? `T${month}-${year}` : `${year}`;
    XLSX.writeFile(wb, `Bao-cao-TK_${bank}_${modeSuffix}.xlsx`);
  }

  const viewModes: { key: ViewMode; label: string }[] = [
    { key: 'week', label: 'Tuần' },
    { key: 'month', label: 'Tháng' },
    { key: 'year', label: 'Năm' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo theo Tài khoản</h1>
          <p className="mt-0.5 text-sm text-gray-500">Tổng hợp theo TK danh mục, nhóm các danh mục cùng TK</p>
        </div>
        <button onClick={handleDownload} disabled={groups.length === 0} className="btn btn-md btn-primary">
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

          <div className="flex items-center gap-1 rounded-lg border border-gray-300 p-0.5">
            {viewModes.map((mode) => (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key)}
                className={clsx(
                  'px-3 py-1 text-sm font-medium rounded-md transition-colors',
                  viewMode === mode.key ? 'bg-[var(--primary)] text-white' : 'text-gray-600 hover:bg-[var(--btn-neutral-hover)]'
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {viewMode === 'week' && (
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
          )}

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

      {groups.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-400">Không có dữ liệu.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">TK</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Danh mục</th>
                  {columnLabels.map((label) => (
                    <th key={label} className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Tổng cộng</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <GroupRows key={group.ledgerAccount} group={group} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900" colSpan={2}>Tổng cộng</td>
                  {grandTotals.values.map((value, i) => (
                    <td key={i} className="text-right px-4 py-3 font-bold tabular-nums text-gray-900">
                      {formatNumber(value)}
                    </td>
                  ))}
                  <td className="text-right px-4 py-3 font-bold tabular-nums text-gray-900">
                    {formatNumber(grandTotals.total)}
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

function GroupRows({ group }: { group: LedgerGroup }) {
  const multiCat = group.categories.length > 1;

  return (
    <>
      {group.categories.map((cat, idx) => (
        <tr key={cat.code} className="border-b border-gray-100 hover:bg-gray-50">
          {idx === 0 ? (
            <td
              className="px-4 py-2.5 font-mono text-xs text-[var(--primary)] bg-[var(--primary-light)]/60 font-semibold whitespace-nowrap"
              rowSpan={multiCat ? group.categories.length + 1 : 1}
            >
              {group.ledgerAccount}
            </td>
          ) : null}
          <td className="px-4 py-2.5">
            <span className="text-gray-800">{cat.name}</span>
            <span className="ml-1.5 text-[10px] text-gray-400">{cat.code}</span>
          </td>
          {cat.values.map((value, i) => (
            <td key={i} className={clsx('text-right px-4 py-2.5 tabular-nums', value === 0 ? 'text-gray-300' : 'text-gray-900')}>
              {value === 0 ? '-' : formatNumber(value)}
            </td>
          ))}
          <td className="text-right px-4 py-2.5 font-semibold tabular-nums text-gray-900">{formatNumber(cat.total)}</td>
        </tr>
      ))}
      {multiCat && (
        <tr className="border-b border-gray-200 bg-[var(--primary-light)]/40">
          <td className="px-4 py-2 text-xs font-bold text-[var(--primary)]">Cộng TK {group.ledgerAccount}</td>
          {group.values.map((value, i) => (
            <td key={i} className="text-right px-4 py-2 text-xs font-bold tabular-nums text-[var(--primary)]">
              {formatNumber(value)}
            </td>
          ))}
          <td className="text-right px-4 py-2 font-bold tabular-nums text-[var(--primary-dark)]">{formatNumber(group.total)}</td>
        </tr>
      )}
    </>
  );
}
