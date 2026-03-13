import { TransactionHistory } from '@/components/features/history/TransactionHistory';

export default function HistoryPage() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Lịch sử giao dịch</h1>
        <p className="text-sm text-gray-500">
          Lưu trữ lịch sử giao dịch BIDV và Agribank, tách theo tháng.
        </p>
      </div>
      <TransactionHistory />
    </div>
  );
}
