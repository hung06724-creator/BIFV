import { TransactionListView } from '@/components/features/transactions/TransactionListView';

export default function TransactionsPage() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Danh sách Giao dịch</h1>
          <p className="text-sm text-gray-500">
            Kiểm tra, phân loại và xác nhận giao dịch sau khi import sao kê ngân hàng.
          </p>
        </div>
      </div>
      <TransactionListView />
    </div>
  );
}
