import { lazy, Suspense, useState } from 'react';
import clsx from 'clsx';

const WeeklyReportView = lazy(async () => {
  const module = await import('@/components/features/reports/WeeklyReportView');
  return { default: module.WeeklyReportView };
});

const LedgerReportView = lazy(async () => {
  const module = await import('@/components/features/reports/LedgerReportView');
  return { default: module.LedgerReportView };
});
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
              'btn btn-md',
              tab === t.key
                ? 'btn-primary'
                : 'btn-neutral'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Suspense fallback={<div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Đang tải báo cáo...</div>}>
        {tab === 'ledger' && <LedgerReportView />}
        {tab === 'weekly' && <WeeklyReportView />}
      </Suspense>
    </div>
  );
}
