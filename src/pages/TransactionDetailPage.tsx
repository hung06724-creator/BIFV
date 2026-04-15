import { useParams, useSearchParams } from 'react-router-dom';
import { TransactionDetailView } from '@/components/features/transactions/detail/TransactionDetailView';

export default function TransactionDetailPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [searchParams] = useSearchParams();
  const shouldFocusClassification = searchParams.get('focus') === 'classification';
  const bankCode = searchParams.get('bank');

  if (!transactionId) {
    return (
      <div className="mx-auto max-w-[1600px] p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Thiếu mã giao dịch.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] p-6">
      <TransactionDetailView
        transactionId={transactionId}
        bankCode={bankCode === 'AGRIBANK' ? 'AGRIBANK' : bankCode === 'BIDV' ? 'BIDV' : undefined}
        autoFocusClassification={shouldFocusClassification}
      />
    </div>
  );
}
