import { useState } from 'react';
import clsx from 'clsx';
import { WeeklyReportView } from '@/components/features/reports/WeeklyReportView';
import { LedgerReportView } from '@/components/features/reports/LedgerReportView';
const TABS = [
  { key: 'ledger', label: 'Báo cáo theo TK' },
  { key: 'weekly', label: 'Báo cáo theo tuần' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function ExportsPage() {
  const [tab, setTab] = useState<TabKey>('ledger');

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'rounded-lg border px-5 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ledger' && <LedgerReportView />}
      {tab === 'weekly' && <WeeklyReportView />}
    </div>
  );
}
