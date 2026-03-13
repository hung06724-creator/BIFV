import { useEffect, useState } from "react";
import { Check, X, Edit, Loader2, AlertCircle } from "lucide-react";
import clsx from "clsx";

export function ReviewDataGrid() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/transactions");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Lỗi tải dữ liệu");
      setTransactions(result.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (matchId: string) => {
    try {
      const res = await fetch(`/api/transactions?matchId=${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      if (!res.ok) throw new Error("Approval failed");
      
      // Update UI optimistically
      setTransactions((prev) =>
        prev.map((t) =>
          t.match_id === matchId ? { ...t, review_status: "approved" } : t
        )
      );
    } catch (error) {
      alert("Lỗi khi duyệt: " + error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-500">Đang tải biểu mẫu dữ liệu...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center text-red-600 bg-red-50 p-4 rounded-lg">
        <AlertCircle className="w-5 h-5 mr-3" />
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-6 py-4 text-left font-semibold">Ngày</th>
              <th className="px-6 py-4 text-left font-semibold">Loại</th>
              <th className="px-6 py-4 text-left font-semibold">Số tiền</th>
              <th className="px-6 py-4 text-left font-semibold w-1/3">Mô tả (Gốc)</th>
              <th className="px-6 py-4 text-left font-semibold">Phân loại Đề xuất</th>
              <th className="px-6 py-4 text-center font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Chưa có giao dịch nào cần xử lý. Hãy import file mới.
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                const isApproved = t.review_status === "approved";
                
                return (
                  <tr key={t.id} className={clsx("hover:bg-gray-50", isApproved && "bg-green-50/50")}>
                    <td className="px-6 py-3 text-gray-600 font-medium">{t.raw_date}</td>
                    <td className="px-6 py-3">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        t.type === 'credit' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      )}>
                        {t.type === 'credit' ? '+ Thu' : '- Chi'}
                      </span>
                    </td>
                    <td className={clsx("px-6 py-3 font-semibold", t.type === 'credit' ? 'text-green-600' : 'text-gray-900')}>
                      {new Intl.NumberFormat('vi-VN').format(t.normalized_amount)} đ
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-gray-800 text-xs truncate max-w-sm" title={t.raw_desc}>
                        {t.raw_desc}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      {t.suggested_category_name ? (
                         <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-medium text-xs border border-indigo-100">
                              {t.suggested_category_name}
                            </span>
                            {t.confidence_score > 0 && <span className="text-[10px] text-gray-400 font-mono">{t.confidence_score}%</span>}
                         </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Không khớp rule nào</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center whitespace-nowrap">
                      {isApproved ? (
                         <span className="inline-flex items-center text-green-600 font-medium text-xs">
                           <Check className="w-4 h-4 mr-1" /> Đã duyệt
                         </span>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => handleConfirm(t.match_id)}
                            className="p-1.5 bg-white text-green-600 border border-green-200 hover:bg-green-50 rounded shadow-sm transition-colors"
                            title="Xác nhận phân loại"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1.5 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded shadow-sm transition-colors"
                            title="Chỉnh sửa (Override)"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
