import {
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  Loader2,
  XCircle,
  FileCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { ParseResult, ClassifyResult } from './types';

const VN_NUMBER = new Intl.NumberFormat('vi-VN');

// ─── Parse Result Panel ────────────────────────────────────

interface ParseStatusProps {
  result: ParseResult;
  onClassify: () => void;
  loading: boolean;
}

export function ParseStatus({ result, onClassify, loading }: ParseStatusProps) {
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Đã parse"
          value={result.total_parsed}
          color="green"
          icon={CheckCircle2}
        />
        <StatCard
          label="Bỏ qua"
          value={result.total_skipped}
          color={result.total_skipped > 0 ? 'yellow' : 'gray'}
          icon={AlertTriangle}
        />
        <StatCard
          label="Tổng dòng"
          value={result.total_parsed + result.total_skipped}
          color="gray"
          icon={BarChart3}
        />
        <StatCard
          label="Trạng thái"
          value={result.status}
          color="blue"
          icon={FileCheck}
          isText
        />
      </div>

      {/* Skipped reasons */}
      {result.skipped_reasons.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-yellow-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <h4 className="text-sm font-medium text-yellow-800">
              Dòng bị bỏ qua ({result.skipped_reasons.length})
            </h4>
          </div>
          <div className="divide-y divide-yellow-100">
            {result.skipped_reasons.map((sr, idx) => (
              <div key={idx} className="px-5 py-2 flex items-center gap-3 text-xs">
                <span className="font-mono text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">
                  Dòng {sr.row_index}
                </span>
                <span className="text-yellow-800">{sr.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sample transactions */}
      {result.sample_transactions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-800">
              Mẫu giao dịch đã parse ({result.sample_transactions.length} dòng đầu)
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ngày gốc</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ngày chuẩn</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Loại</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Số tiền</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mô tả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.sample_transactions.map((t, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {t.raw_date.split(' ')[0]}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono text-gray-700">{t.normalized_date}</td>
                    <td className="px-4 py-2">
                      <span
                        className={clsx(
                          'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium',
                          t.type === 'credit'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        )}
                      >
                        {t.type === 'credit' ? '+ Thu' : '- Chi'}
                      </span>
                    </td>
                    <td
                      className={clsx(
                        'px-4 py-2 text-right text-xs font-mono font-medium',
                        t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {VN_NUMBER.format(t.normalized_amount)}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-700 max-w-[300px] truncate" title={t.raw_desc}>
                      {t.raw_desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action: Classify */}
      <div className="flex justify-end">
        <button
          onClick={onClassify}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang phân loại...
            </>
          ) : (
            <>
              <BarChart3 className="w-4 h-4" />
              Classify Batch
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Classify Result Panel ─────────────────────────────────

interface ClassifyStatusProps {
  result: ClassifyResult;
  batchId: string;
  onFinish: () => void;
}

export function ClassifyStatus({ result, batchId, onFinish }: ClassifyStatusProps) {
  const s = result.classification_summary;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Đã phân loại" value={s.classified} color="green" icon={CheckCircle2} />
        <StatCard label="Chưa phân loại" value={s.unclassified} color="red" icon={XCircle} />
        <StatCard label="Tin cậy cao" value={s.high_confidence} color="green" icon={CheckCircle2} />
        <StatCard label="Tin cậy thấp" value={s.low_confidence} color="yellow" icon={AlertTriangle} />
        <StatCard label="Tổng" value={result.total_transactions} color="gray" icon={BarChart3} />
      </div>

      {/* Top categories */}
      {result.top_categories.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-800">Phân bổ theo đầu mục</h4>
          </div>
          <div className="divide-y divide-gray-100">
            {result.top_categories.map((cat) => {
              const pct = Math.round((cat.count / result.total_transactions) * 100);
              return (
                <div key={cat.category_id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-400">{cat.category_code}</span>
                      <span className="text-sm font-medium text-gray-800">{cat.category_name}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-bold text-gray-800">{cat.count}</span>
                    <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-4">
        <div>
          <p className="text-sm font-medium text-green-800">
            ✅ Phân loại hoàn tất! Batch sẵn sàng để review.
          </p>
          <p className="text-xs text-green-600 mt-0.5">
            {s.unclassified > 0
              ? `Còn ${s.unclassified} giao dịch chưa phân loại cần review thủ công.`
              : 'Tất cả giao dịch đã được phân loại.'}
          </p>
        </div>
        <Link
          to="/transactions"
          onClick={onFinish}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          Đến trang Review
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// ─── Shared StatCard ───────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon: Icon,
  isText,
}: {
  label: string;
  value: number | string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  icon: React.ComponentType<{ className?: string }>;
  isText?: boolean;
}) {
  const colorMap = {
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  }[color];

  return (
    <div className={clsx('border rounded-xl px-4 py-3', colorMap)}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 opacity-60" />
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className={clsx('font-bold', isText ? 'text-sm capitalize' : 'text-xl font-mono')}>
        {isText ? value : VN_NUMBER.format(value as number)}
      </p>
    </div>
  );
}
