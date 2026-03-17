import { AlertTriangle, Clock, HelpCircle, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { UrgentTransaction } from './types';

interface UrgentTableProps {
  transactions: UrgentTransaction[];
}

const VN = new Intl.NumberFormat('vi-VN');

export function UrgentTable({ transactions }: UrgentTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-800">Cần xử lý gấp</h3>
          <span className="text-xs text-gray-400">({transactions.length} giao dịch)</span>
        </div>
        <Link
          to="/transactions"
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          Xem tất cả <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Ngày</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-[280px]">Mô tả</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Số tiền</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Gợi ý ĐM</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Tin cậy</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((t) => {
              const pct = Math.round(t.confidence_score * 100);
              const isLowConf = pct < 50;
              const isUnclassified = t.status === 'pending_classification';

              return (
                <tr
                  key={t.id}
                  className={clsx(
                    'hover:bg-gray-50 transition-colors',
                    (isLowConf || isUnclassified) && 'bg-amber-50/40'
                  )}
                >
                  <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                    {t.raw_date.split(' ')[0]}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      to={`/transactions/${t.id}`}
                      className="text-xs text-gray-800 hover:text-indigo-600 truncate block max-w-[280px]"
                      title={t.raw_desc}
                    >
                      {t.raw_desc}
                    </Link>
                  </td>
                  <td className={clsx(
                    'px-4 py-2 text-right text-xs font-mono font-semibold',
                    t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  )}>
                    {t.type === 'debit' ? '-' : '+'}{VN.format(t.normalized_amount)}
                  </td>
                  <td className="px-4 py-2">
                    {t.suggested_category_name ? (
                      <span className="inline-flex px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100 truncate max-w-[150px]">
                        {t.suggested_category_name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Không khớp</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={clsx(
                      'inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-bold',
                      pct >= 85 ? 'bg-green-100 text-green-700'
                        : pct >= 50 ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    )}>
                      {pct}%
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {isUnclassified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                        <Clock className="w-2.5 h-2.5" /> Chờ PL
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                        <HelpCircle className="w-2.5 h-2.5" /> Chờ duyệt
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
