import {
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  Loader2,
  XCircle,
  FileCheck,
  Split,
} from 'lucide-react';
import clsx from 'clsx';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import type { ParseResult, ClassifyResult } from './types';

const VN_NUMBER = new Intl.NumberFormat('vi-VN');

interface ParseStatusProps {
  result: ParseResult;
  onClassify: () => void;
  loading: boolean;
}

export function ParseStatus({ result, onClassify, loading }: ParseStatusProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Đã phân tích" value={result.total_parsed} color="green" icon={CheckCircle2} />
        <StatCard label="Bỏ qua" value={result.total_skipped} color={result.total_skipped > 0 ? 'yellow' : 'gray'} icon={AlertTriangle} />
        <StatCard label="Tổng dòng" value={result.total_parsed + result.total_skipped} color="gray" icon={BarChart3} />
        <StatCard label="Trạng thái" value={result.status} color="blue" icon={FileCheck} isText />
      </div>

      {result.skipped_reasons.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2 border-b border-yellow-100 px-5 py-3">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <h4 className="text-sm font-medium text-yellow-800">Dòng bị bỏ qua ({result.skipped_reasons.length})</h4>
          </div>
          <div className="divide-y divide-yellow-100">
            {result.skipped_reasons.map((sr, idx) => (
              <div key={idx} className="flex items-center gap-3 px-5 py-2 text-xs">
                <span className="rounded bg-yellow-100 px-1.5 py-0.5 font-mono text-yellow-600">Dòng {sr.row_index}</span>
                <span className="text-yellow-800">{sr.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.sample_transactions.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h4 className="text-sm font-semibold text-gray-800">
              Mẫu giao dịch đã phân tích ({result.sample_transactions.length} dòng đầu)
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
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-600">{t.raw_date.split(' ')[0]}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{t.normalized_date}</td>
                    <td className="px-4 py-2">
                      <span
                        className={clsx(
                          'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium',
                          t.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        )}
                      >
                        {t.type === 'credit' ? '+ Thu' : '- Chi'}
                      </span>
                    </td>
                    <td
                      className={clsx(
                        'px-4 py-2 text-right font-mono text-xs font-medium',
                        t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {VN_NUMBER.format(t.normalized_amount)}
                    </td>
                    <td className="max-w-[300px] truncate px-4 py-2 text-xs text-gray-700" title={t.raw_desc}>
                      {t.raw_desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onClassify}
          disabled={loading}
          className="btn btn-md btn-primary disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang phân loại...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4" />
              Phân loại dữ liệu
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface ClassifyStatusProps {
  result: ClassifyResult;
  batchId: string;
  onFinish: () => void;
}

export function ClassifyStatus({ result, batchId, onFinish }: ClassifyStatusProps) {
  const s = result.classification_summary;
  const splitSummary = result.split_summary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Đã phân loại" value={s.classified} color="green" icon={CheckCircle2} />
        <StatCard label="Chưa phân loại" value={s.unclassified} color="red" icon={XCircle} />
        <StatCard label="Tin cậy cao" value={s.high_confidence} color="green" icon={CheckCircle2} />
        <StatCard label="Tin cậy thấp" value={s.low_confidence} color="yellow" icon={AlertTriangle} />
        <StatCard label="Tổng" value={result.total_transactions} color="gray" icon={BarChart3} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Trực tiếp" value={splitSummary.direct} color="gray" icon={FileCheck} />
        <StatCard label="Ngang" value={splitSummary.horizontal} color="blue" icon={Split} />
        <StatCard label="Dọc" value={splitSummary.vertical} color="yellow" icon={Split} />
        <StatCard label="Cần xem phân bổ" value={splitSummary.review_required} color="red" icon={AlertTriangle} />
      </div>

      {result.top_categories.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h4 className="text-sm font-semibold text-gray-800">Phân bổ theo đầu mục</h4>
          </div>
          <div className="divide-y divide-gray-100">
            {result.top_categories.map((cat) => {
              const pct = Math.round((cat.count / result.total_transactions) * 100);
              return (
                <div key={cat.category_id} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">{cat.category_code}</span>
                      <span className="text-sm font-medium text-gray-800">{cat.category_name}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div className="h-1.5 rounded-full bg-[var(--primary)] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-sm font-bold text-gray-800">{cat.count}</span>
                    <span className="ml-1 text-xs text-gray-400">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-green-800">Phân loại hoàn tất. Lô dữ liệu sẵn sàng để kiểm tra.</p>
          <p className="mt-0.5 text-xs text-green-600">
            {s.unclassified > 0
              ? `Còn ${s.unclassified} giao dịch chưa phân loại cần kiểm tra thủ công.`
              : 'Tất cả giao dịch đã được phân loại.'}
          </p>
          <p className="mt-0.5 text-xs text-green-600">
            {splitSummary.review_required > 0
              ? `Có ${splitSummary.review_required} giao dịch ngang/dọc nên kiểm tra phân bổ trước khi xác nhận.`
              : 'Không có giao dịch phân bổ cần kiểm tra.'}
          </p>
        </div>
        <Link
          to={`/transactions?batch=${batchId}`}
          onClick={onFinish}
          className="btn btn-md btn-primary"
        >
          Đến trang Kiểm tra
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

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
  icon: ComponentType<{ className?: string }>;
  isText?: boolean;
}) {
  const colorMap = {
    green: 'border-green-200 bg-green-50 text-green-700',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    gray: 'border-gray-200 bg-gray-50 text-gray-700',
  }[color];

  return (
    <div className={clsx('rounded-xl border px-4 py-3', colorMap)}>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 opacity-60" />
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className={clsx('font-bold', isText ? 'text-sm capitalize' : 'text-xl font-mono')}>
        {isText ? value : VN_NUMBER.format(value as number)}
      </p>
    </div>
  );
}
