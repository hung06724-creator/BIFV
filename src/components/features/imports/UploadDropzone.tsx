import { useState } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { BankCode } from './types';
import { BANK_OPTIONS } from './types';

interface UploadDropzoneProps {
  bankCode: BankCode;
  onBankCodeChange: (code: BankCode) => void;
  onUpload: (file: File) => void;
  loading: boolean;
  error: string | null;
}

const VALID_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

function getBankButtonClass(activeBank: BankCode, buttonBank: BankCode) {
  if (activeBank !== buttonBank) {
    return 'bg-white text-gray-700 border-gray-200 hover:bg-[var(--btn-neutral-hover)]';
  }

  return buttonBank === 'AGRIBANK'
    ? 'bg-[var(--agribank)] text-white border-[var(--agribank)]'
    : 'bg-[var(--primary)] text-white border-[var(--primary)]';
}

export function UploadDropzone({
  bankCode,
  onBankCodeChange,
  onUpload,
  loading,
  error,
}: UploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = error || localError;

  const validateAndSet = (file: File) => {
    setLocalError(null);
    if (!VALID_TYPES.includes(file.type)) {
      setLocalError('Chỉ hỗ trợ file Excel (.xlsx, .xls) hoặc CSV (.csv).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setLocalError('File quá lớn. Giới hạn 50MB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndSet(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) validateAndSet(e.target.files[0]);
  };

  const handleSubmit = () => {
    if (selectedFile && !loading) onUpload(selectedFile);
  };

  return (
    <div className="space-y-5">
      {/* Bank selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngân hàng</label>
        <div className="flex gap-2">
          {BANK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onBankCodeChange(opt.value)}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                getBankButtonClass(bankCode, opt.value)
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dropzone */}
      <div
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-12 text-center transition-colors',
          dragActive
            ? 'border-[var(--primary)] bg-[var(--primary-light)]'
            : 'border-gray-300 hover:border-[var(--primary)] bg-gray-50',
          displayError && 'border-red-400 bg-red-50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          <UploadCloud
            className={clsx('h-12 w-12', dragActive ? 'text-[var(--primary)]' : 'text-gray-400')}
          />
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-[var(--primary)] hover:underline cursor-pointer">
              Bấm để chọn file
            </span>{' '}
            hoặc kéo thả vào đây
          </div>
          <p className="text-xs text-gray-500">Hỗ trợ: .xlsx, .xls, .csv — Tối đa 50MB</p>
        </div>
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        />
      </div>

      {/* Error */}
      {displayError && (
        <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {displayError}
        </div>
      )}

      {/* Selected file card */}
      {selectedFile && !displayError && (
        <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3 truncate">
            <FileSpreadsheet className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div className="truncate">
              <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ngân hàng: {bankCode}
              </p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-md btn-primary ml-4 flex-shrink-0 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tải lên...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                Tải lên & Xem trước
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
