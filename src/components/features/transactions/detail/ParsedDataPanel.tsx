import { Cpu, User, Building2, CreditCard, ArrowRightLeft, FileSearch } from 'lucide-react';

interface ParsedDataPanelProps {
  sender_name: string | null;
  sender_bank: string | null;
  sender_account_hint: string | null;
  transfer_ref: string | null;
  normalized_description: string;
  no_accent_description: string;
}

export function ParsedDataPanel({
  sender_name,
  sender_bank,
  sender_account_hint,
  transfer_ref,
  normalized_description,
  no_accent_description,
}: ParsedDataPanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <Cpu className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-gray-800">Dữ liệu phân tích (Parsed)</h3>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Heuristic</span>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ParsedField
            icon={User}
            label="Người chuyển"
            value={sender_name}
            highlight
          />
          <ParsedField
            icon={Building2}
            label="Ngân hàng"
            value={sender_bank}
          />
          <ParsedField
            icon={CreditCard}
            label="Số TK (gợi ý)"
            value={sender_account_hint}
            mono
          />
          <ParsedField
            icon={ArrowRightLeft}
            label="Mã chuyển tiền"
            value={transfer_ref}
            mono
          />
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <FileSearch className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">Mô tả chuẩn hóa</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono break-all leading-relaxed">
            {normalized_description}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1">
            <FileSearch className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">Mô tả không dấu (dùng cho matching)</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 font-mono break-all leading-relaxed">
            {no_accent_description}
          </div>
        </div>
      </div>
    </div>
  );
}

function ParsedField({
  icon: Icon,
  label,
  value,
  mono,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      {value ? (
        <p className={`text-sm ${mono ? 'font-mono' : ''} ${highlight ? 'text-indigo-700 font-semibold' : 'text-gray-800'}`}>
          {value}
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">Không xác định</p>
      )}
    </div>
  );
}
