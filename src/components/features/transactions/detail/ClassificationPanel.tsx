import { useState } from 'react';
import {
  Brain,
  Check,
  RefreshCw,
  AlertTriangle,
  Shield,
  BookOpen,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import clsx from 'clsx';

interface MatchedRule {
  id: string;
  keyword: string;
  type: string;
  priority: number;
  category_code: string;
  category_name: string;
}

interface MatchData {
  id: string;
  suggested_category_id: string | null;
  suggested_category_code: string | null;
  suggested_category_name: string | null;
  confidence_score: number;
  matched_rules: MatchedRule[];
  explanation: string;
  is_manually_overridden: boolean;
  confirmed_category_id: string | null;
  confirmed_category_code: string | null;
  confirmed_category_name: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  reviewer_name: string | null;
  reviewed_at: string | null;
}

interface ClassificationPanelProps {
  match: MatchData | null;
  categories: { id: string; code: string; name: string }[];
  transactionStatus: string;
  onConfirm: (categoryId: string, reviewStatus: 'approved' | 'rejected', notes: string) => void;
  onRerunSuggest: () => void;
  loading: boolean;
}

function ConfidenceMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all',
            pct >= 85 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={clsx(
          'text-sm font-bold font-mono',
          pct >= 85 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'
        )}
      >
        {pct}%
      </span>
    </div>
  );
}

function ReviewStatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const config = {
    pending: { label: 'Chờ duyệt', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    approved: { label: 'Đã duyệt', cls: 'bg-green-100 text-green-700 border-green-200' },
    rejected: { label: 'Từ chối', cls: 'bg-red-100 text-red-700 border-red-200' },
  }[status];

  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', config.cls)}>
      {config.label}
    </span>
  );
}

export function ClassificationPanel({
  match,
  categories,
  transactionStatus,
  onConfirm,
  onRerunSuggest,
  loading,
}: ClassificationPanelProps) {
  const [showRules, setShowRules] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    match?.confirmed_category_id || match?.suggested_category_id || ''
  );
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>(
    match?.review_status === 'rejected' ? 'rejected' : 'approved'
  );
  const [notes, setNotes] = useState('');

  const isExported = transactionStatus === 'exported';
  const isConfirmed = transactionStatus === 'confirmed';

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-800">Phân loại (Classification)</h3>
          {match && <ReviewStatusBadge status={match.review_status} />}
        </div>
        <button
          onClick={onRerunSuggest}
          disabled={loading || isExported}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Chạy lại Suggest
        </button>
      </div>

      <div className="p-5 space-y-5">
        {!match ? (
          <div className="text-center py-8 text-gray-500">
            <Brain className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Chưa có kết quả phân loại. Hãy chạy Classification Engine.</p>
          </div>
        ) : (
          <>
            {/* Suggested vs Confirmed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Suggested */}
              <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-blue-700">Gợi ý (Auto)</span>
                </div>
                {match.suggested_category_name ? (
                  <div>
                    <p className="text-sm font-semibold text-blue-800">
                      {match.suggested_category_code} – {match.suggested_category_name}
                    </p>
                    <div className="mt-2">
                      <ConfidenceMeter score={match.confidence_score} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Không khớp rule nào</p>
                )}
              </div>

              {/* Confirmed */}
              <div className={clsx(
                'border rounded-lg p-4',
                match.confirmed_category_name
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-gray-200 bg-gray-50'
              )}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-green-500" />
                  <span className={clsx(
                    'text-xs font-medium',
                    match.confirmed_category_name ? 'text-green-700' : 'text-gray-500'
                  )}>
                    Xác nhận
                  </span>
                  {match.is_manually_overridden && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Override
                    </span>
                  )}
                </div>
                {match.confirmed_category_name ? (
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      {match.confirmed_category_code} – {match.confirmed_category_name}
                    </p>
                    {match.reviewer_name && (
                      <p className="text-xs text-gray-500 mt-1">
                        Bởi: {match.reviewer_name}
                        {match.reviewed_at && ` • ${new Date(match.reviewed_at).toLocaleDateString('vi-VN')}`}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Chưa xác nhận</p>
                )}
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
              <p className="text-xs text-gray-600">
                <span className="font-medium text-gray-700">Giải thích: </span>
                {match.explanation}
              </p>
            </div>

            {/* Matched Rules (collapsible) */}
            {match.matched_rules.length > 0 && (
              <div>
                <button
                  onClick={() => setShowRules(!showRules)}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800"
                >
                  {showRules ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Rules đã khớp ({match.matched_rules.length})
                </button>

                {showRules && (
                  <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Rule ID</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Loại</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Keyword</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500">Priority</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {match.matched_rules.map((rule) => (
                          <tr key={rule.id} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 font-mono text-gray-500">{rule.id}</td>
                            <td className="px-3 py-1.5">
                              <span className="inline-flex px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-medium">
                                {rule.type}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 font-mono text-gray-700 max-w-[200px] truncate">{rule.keyword}</td>
                            <td className="px-3 py-1.5 text-center font-mono">{rule.priority}</td>
                            <td className="px-3 py-1.5 text-gray-700">{rule.category_code} – {rule.category_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Edit form */}
            {!isExported && (
              <div className="border-t border-gray-200 pt-5 space-y-4">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Chỉnh sửa & Xác nhận</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Đầu mục xác nhận</label>
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      disabled={isExported}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    >
                      <option value="">— Chọn đầu mục —</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.code} – {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Trạng thái duyệt</label>
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value as 'approved' | 'rejected')}
                      disabled={isExported}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    >
                      <option value="approved">✅ Duyệt (Approved)</option>
                      <option value="rejected">❌ Từ chối (Rejected)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú reviewer</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Nhập lý do chỉnh sửa, ghi chú cho bộ phận kế toán..."
                    disabled={isExported}
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (!selectedCategoryId) return;
                      onConfirm(selectedCategoryId, reviewStatus, notes);
                    }}
                    disabled={loading || !selectedCategoryId || isExported}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Xác nhận phân loại
                  </button>

                  {isConfirmed && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Giao dịch đã được xác nhận
                    </span>
                  )}
                </div>
              </div>
            )}

            {isExported && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
                Giao dịch đã được xuất. Không thể chỉnh sửa.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
