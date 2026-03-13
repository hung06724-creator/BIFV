import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Check,
  Clock,
  HelpCircle,
  FileOutput,
} from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useTransactionDetail } from './useTransactionDetail';
import { RawDataPanel } from './RawDataPanel';
import { ParsedDataPanel } from './ParsedDataPanel';
import { ClassificationPanel } from './ClassificationPanel';
import { AuditLogPanel } from './AuditLogPanel';

interface TransactionDetailViewProps {
  transactionId: string;
}

const VN_NUMBER = new Intl.NumberFormat('vi-VN');

export function TransactionDetailView({ transactionId }: TransactionDetailViewProps) {
  const {
    transaction,
    categories,
    loading,
    error,
    confirmClassification,
    rerunSuggest,
  } = useTransactionDetail(transactionId);

  if (error) {
    return (
      <div className="flex items-center text-red-600 bg-red-50 p-4 rounded-lg">
        <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
        {error}
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-500">Đang tải dữ liệu giao dịch...</span>
      </div>
    );
  }

  const statusConfig = {
    pending_classification: { label: 'Chờ phân loại', icon: Clock, cls: 'bg-gray-100 text-gray-600' },
    classified: { label: 'Đã phân loại', icon: HelpCircle, cls: 'bg-blue-100 text-blue-700' },
    confirmed: { label: 'Đã xác nhận', icon: Check, cls: 'bg-green-100 text-green-700' },
    exported: { label: 'Đã xuất', icon: FileOutput, cls: 'bg-purple-100 text-purple-700' },
  }[transaction.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/transactions"
            className="flex items-center justify-center w-9 h-9 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">Chi tiết Giao dịch</h1>
              <span className={clsx(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                statusConfig.cls
              )}>
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="font-mono">{transaction.id}</span>
              <span>•</span>
              <span>{transaction.raw_date}</span>
              <span>•</span>
              <span className={clsx(
                'font-semibold',
                transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
              )}>
                {transaction.type === 'debit' ? '-' : '+'}{VN_NUMBER.format(transaction.normalized_amount)} đ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel 1: Raw Data */}
      <RawDataPanel
        raw_desc={transaction.raw_desc}
        raw_reference={transaction.raw_reference}
        raw_date={transaction.raw_date}
        debit_amount={transaction.debit_amount}
        credit_amount={transaction.credit_amount}
        normalized_amount={transaction.normalized_amount}
        balance_after={transaction.balance_after}
        type={transaction.type}
      />

      {/* Panel 2: Parsed Data */}
      <ParsedDataPanel
        sender_name={transaction.parsed.sender_name}
        sender_bank={transaction.parsed.sender_bank}
        sender_account_hint={transaction.parsed.sender_account_hint}
        transfer_ref={transaction.parsed.transfer_ref}
        normalized_description={transaction.parsed.normalized_description}
        no_accent_description={transaction.parsed.no_accent_description}
      />

      {/* Panel 3: Classification */}
      <ClassificationPanel
        match={transaction.match}
        categories={categories}
        transactionStatus={transaction.status}
        onConfirm={confirmClassification}
        onRerunSuggest={rerunSuggest}
        loading={loading}
      />

      {/* Panel 4: Audit Log */}
      <AuditLogPanel logs={transaction.audit_logs} />
    </div>
  );
}
