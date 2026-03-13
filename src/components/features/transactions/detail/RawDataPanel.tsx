import { FileText, Calendar, Hash, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import clsx from 'clsx';

interface RawDataPanelProps {
  raw_desc: string;
  raw_reference: string;
  raw_date: string;
  debit_amount: number;
  credit_amount: number;
  normalized_amount: number;
  balance_after: number | null;
  type: 'credit' | 'debit';
}

const VN_NUMBER = new Intl.NumberFormat('vi-VN');

export function RawDataPanel({
  raw_desc,
  raw_reference,
  raw_date,
  debit_amount,
  credit_amount,
  normalized_amount,
  balance_after,
  type,
}: RawDataPanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-800">Dữ liệu gốc</h3>
      </div>
      <div className="p-5 space-y-4">
        {/* Raw description - full width */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Mô tả gốc (raw_description)</label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono break-all leading-relaxed">
            {raw_desc}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DataField icon={Hash} label="Mã tham chiếu" value={raw_reference || '—'} mono />
          <DataField icon={Calendar} label="Ngày hiệu lực" value={raw_date} />
          <DataField
            icon={ArrowDownLeft}
            label="Ghi nợ (Debit)"
            value={debit_amount > 0 ? `${VN_NUMBER.format(debit_amount)} đ` : '—'}
            valueColor={debit_amount > 0 ? 'text-red-600' : 'text-gray-400'}
          />
          <DataField
            icon={ArrowUpRight}
            label="Ghi có (Credit)"
            value={credit_amount > 0 ? `${VN_NUMBER.format(credit_amount)} đ` : '—'}
            valueColor={credit_amount > 0 ? 'text-green-600' : 'text-gray-400'}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DataField
            icon={type === 'credit' ? ArrowUpRight : ArrowDownLeft}
            label="Số tiền thực"
            value={`${type === 'debit' ? '-' : '+'}${VN_NUMBER.format(normalized_amount)} đ`}
            valueColor={type === 'credit' ? 'text-green-600' : 'text-red-600'}
            bold
          />
          <DataField
            icon={Wallet}
            label="Số dư sau GD"
            value={balance_after != null ? `${VN_NUMBER.format(balance_after)} đ` : '—'}
          />
        </div>
      </div>
    </div>
  );
}

function DataField({
  icon: Icon,
  label,
  value,
  valueColor,
  mono,
  bold,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={clsx(
        'text-sm',
        valueColor || 'text-gray-800',
        mono && 'font-mono',
        bold && 'font-semibold'
      )}>
        {value}
      </p>
    </div>
  );
}
