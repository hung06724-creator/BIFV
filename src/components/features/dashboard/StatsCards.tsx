import {
  BarChart3,
  ArrowUpRight,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';
import type { DashboardStats } from './types';

interface StatsCardsProps {
  stats: DashboardStats;
}

const VN = new Intl.NumberFormat('vi-VN');

function formatMoney(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}T`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}Tr`;
  return VN.format(n);
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    iconBg: string;
  }[] = [
    {
      label: 'Tổng giao dịch',
      value: VN.format(stats.total_transactions),
      sub: `${VN.format(stats.by_status.exported)} đã xuất`,
      icon: BarChart3,
      color: 'text-gray-800',
      iconBg: 'bg-gray-100 text-gray-600',
    },
    {
      label: 'Tổng thu (Credit)',
      value: `${formatMoney(stats.total_credit)} đ`,
      sub: `Chi: ${formatMoney(stats.total_debit)} đ`,
      icon: ArrowUpRight,
      color: 'text-green-700',
      iconBg: 'bg-green-100 text-green-600',
    },
    {
      label: 'Chưa xử lý',
      value: VN.format(stats.unresolved),
      sub: `${VN.format(stats.by_status.pending_classification)} chờ phân loại`,
      icon: AlertCircle,
      color: 'text-red-700',
      iconBg: 'bg-red-100 text-red-600',
    },
    {
      label: 'Chờ review',
      value: VN.format(stats.pending_review),
      sub: 'Classified, chưa duyệt',
      icon: Clock,
      color: 'text-amber-700',
      iconBg: 'bg-amber-100 text-amber-600',
    },
    {
      label: 'Đã xác nhận',
      value: VN.format(stats.confirmed),
      sub: `${Math.round((stats.confirmed / stats.total_transactions) * 100)}% tổng`,
      icon: CheckCircle2,
      color: 'text-green-700',
      iconBg: 'bg-green-100 text-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', card.iconBg)}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className={clsx('text-2xl font-bold font-mono', card.color)}>
              {card.value}
            </p>
            {card.sub && (
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
