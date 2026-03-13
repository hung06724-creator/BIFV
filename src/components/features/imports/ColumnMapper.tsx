import { useState } from 'react';
import { Columns3, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface ColumnMapperProps {
  detectedColumns: string[];
  onMappingChange?: (mapping: Record<string, string>) => void;
}

const MAPPING_FIELDS = [
  { key: 'date_column', label: 'Cột ngày', hint: 'Ngày hiệu lực / Date' },
  { key: 'debit_column', label: 'Cột ghi nợ', hint: 'Ghi nợ / Debit' },
  { key: 'credit_column', label: 'Cột ghi có', hint: 'Ghi có / Credit' },
  { key: 'balance_column', label: 'Cột số dư', hint: 'Số dư / Balance' },
  { key: 'description_column', label: 'Cột mô tả', hint: 'Mô tả / Description' },
  { key: 'reference_column', label: 'Cột mã GD', hint: 'STT / Reference' },
] as const;

function autoDetect(columns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lower = columns.map((c) => c.toLowerCase());

  const dateIdx = lower.findIndex((c) => c.includes('ngày') || c.includes('date'));
  if (dateIdx >= 0) mapping.date_column = columns[dateIdx];

  const debitIdx = lower.findIndex((c) => c.includes('nợ') || c.includes('debit'));
  if (debitIdx >= 0) mapping.debit_column = columns[debitIdx];

  const creditIdx = lower.findIndex((c) => c.includes('có') || c.includes('credit'));
  if (creditIdx >= 0) mapping.credit_column = columns[creditIdx];

  const balIdx = lower.findIndex((c) => c.includes('dư') || c.includes('balance'));
  if (balIdx >= 0) mapping.balance_column = columns[balIdx];

  const descIdx = lower.findIndex((c) => c.includes('mô tả') || c.includes('desc'));
  if (descIdx >= 0) mapping.description_column = columns[descIdx];

  const refIdx = lower.findIndex((c) => c.includes('stt') || c.includes('ref'));
  if (refIdx >= 0) mapping.reference_column = columns[refIdx];

  return mapping;
}

export function ColumnMapper({ detectedColumns, onMappingChange }: ColumnMapperProps) {
  const [expanded, setExpanded] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>(() =>
    autoDetect(detectedColumns)
  );

  const handleChange = (key: string, value: string) => {
    const next = { ...mapping, [key]: value };
    setMapping(next);
    onMappingChange?.(next);
  };

  const autoDetectedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <Columns3 className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-800">Column Mapping</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {autoDetectedCount}/{MAPPING_FIELDS.length} auto-detected
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
            <Info className="w-3 h-3" />
            Hệ thống đã auto-detect dựa trên tên cột. Bạn có thể chỉnh lại nếu sai.
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {MAPPING_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {field.label}
                </label>
                <select
                  value={mapping[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Không chọn —</option>
                  {detectedColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-0.5">{field.hint}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
