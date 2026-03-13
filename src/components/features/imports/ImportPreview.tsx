import { Table2, Columns3, FileText, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { UploadResult } from './types';

interface ImportPreviewProps {
  uploadResult: UploadResult;
  onParse: () => void;
  loading: boolean;
}

const VN_NUMBER = new Intl.NumberFormat('vi-VN');

function formatCell(value: any): string {
  if (value == null) return '';
  if (typeof value === 'number') return VN_NUMBER.format(value);
  return String(value);
}

export function ImportPreview({ uploadResult, onParse, loading }: ImportPreviewProps) {
  const { detected_columns, preview_rows, total_rows, filename, bank_code } = uploadResult;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{filename}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{bank_code}</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Table2 className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-indigo-600">{total_rows}</span> dòng dữ liệu
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Columns3 className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-indigo-600">{detected_columns.length}</span> cột phát hiện
          </div>
        </div>

        <button
          onClick={onParse}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang parse...
            </>
          ) : (
            'Parse Batch →'
          )}
        </button>
      </div>

      {/* Detected columns */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Columns3 className="w-4 h-4 text-indigo-500" />
            Cột phát hiện được
          </h3>
        </div>
        <div className="px-5 py-3 flex flex-wrap gap-2">
          {detected_columns.map((col, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100"
            >
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Preview table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Table2 className="w-4 h-4 text-green-600" />
            Preview dữ liệu
            <span className="text-xs text-gray-400 font-normal">
              (hiển thị {preview_rows.length} / {total_rows} dòng)
            </span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                  #
                </th>
                {detected_columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {preview_rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-400 font-mono">{rowIdx + 1}</td>
                  {detected_columns.map((col) => {
                    const val = row[col];
                    const isNumber = typeof val === 'number';
                    const isDebit = col.toLowerCase().includes('nợ') && val > 0;
                    const isCredit = col.toLowerCase().includes('có') && val > 0;

                    return (
                      <td
                        key={col}
                        className={clsx(
                          'px-3 py-2 text-xs',
                          isNumber ? 'text-right font-mono' : 'text-left',
                          isDebit && 'text-red-600 font-medium',
                          isCredit && 'text-green-600 font-medium',
                          !isDebit && !isCredit && 'text-gray-700',
                          col.toLowerCase().includes('mô tả') && 'max-w-[300px] truncate'
                        )}
                        title={col.toLowerCase().includes('mô tả') ? String(val || '') : undefined}
                      >
                        {formatCell(val) || <span className="text-gray-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
