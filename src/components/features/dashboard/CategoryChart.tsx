import clsx from 'clsx';
import type { CategoryBreakdown } from './types';

interface CategoryChartProps {
  data: CategoryBreakdown[];
}

const VN = new Intl.NumberFormat('vi-VN');

const BAR_COLORS = [
  'bg-indigo-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-gray-400',
];

export function CategoryChart({ data }: CategoryChartProps) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Phân bổ theo đầu mục</h3>
        <p className="text-xs text-gray-400 mt-0.5">Giao dịch đã confirmed, nhóm theo category</p>
      </div>
      <div className="p-5 space-y-3">
        {data.map((item, idx) => {
          const pct = Math.round((item.total / maxTotal) * 100);
          const barColor = BAR_COLORS[idx % BAR_COLORS.length];

          return (
            <div key={item.category_code}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-gray-400 w-12 flex-shrink-0">
                    {item.category_code}
                  </span>
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {item.category_name}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className="text-xs text-gray-400">{item.count} GD</span>
                  <span className="text-xs font-semibold font-mono text-gray-700 w-24 text-right">
                    {VN.format(item.total)} đ
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={clsx('h-2 rounded-full transition-all duration-500', barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
