import clsx from 'clsx';
import type { DashboardStats } from './types';

interface StatusBreakdownProps {
  stats: DashboardStats;
}

const VN = new Intl.NumberFormat('vi-VN');

const SEGMENTS: {
  key: keyof DashboardStats['by_status'];
  label: string;
  color: string;
  bgBar: string;
}[] = [
  { key: 'confirmed', label: 'Đã xác nhận', color: 'text-green-700', bgBar: 'bg-green-500' },
  { key: 'exported', label: 'Đã xuất', color: 'text-purple-700', bgBar: 'bg-purple-500' },
  { key: 'classified', label: 'Đã phân loại', color: 'text-blue-700', bgBar: 'bg-blue-500' },
  { key: 'pending_classification', label: 'Chờ phân loại', color: 'text-gray-600', bgBar: 'bg-gray-400' },
];

export function StatusBreakdown({ stats }: StatusBreakdownProps) {
  const total = stats.total_transactions || 1;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Tiến độ xử lý</h3>
      </div>
      <div className="p-5 space-y-4">
        {/* Stacked bar */}
        <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
          {SEGMENTS.map((seg) => {
            const count = stats.by_status[seg.key];
            const pct = (count / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={seg.key}
                className={clsx('transition-all duration-500', seg.bgBar)}
                style={{ width: `${pct}%` }}
                title={`${seg.label}: ${count} (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2">
          {SEGMENTS.map((seg) => {
            const count = stats.by_status[seg.key];
            const pct = Math.round((count / total) * 100);
            return (
              <div key={seg.key} className="flex items-center gap-2">
                <div className={clsx('w-3 h-3 rounded-sm flex-shrink-0', seg.bgBar)} />
                <span className="text-xs text-gray-600">{seg.label}</span>
                <span className={clsx('text-xs font-bold font-mono ml-auto', seg.color)}>
                  {VN.format(count)}
                </span>
                <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
