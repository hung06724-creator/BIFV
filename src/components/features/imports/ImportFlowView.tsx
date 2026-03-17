import {
  UploadCloud,
  Eye,
  Cpu,
  Brain,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import clsx from 'clsx';
import { useImportFlow } from './useImportFlow';
import { UploadDropzone } from './UploadDropzone';
import { ImportPreview } from './ImportPreview';
import { ColumnMapper } from './ColumnMapper';
import { ParseStatus, ClassifyStatus } from './BatchStatus';
import type { ImportStep } from './types';

const STEPS: { key: ImportStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'upload', label: 'Tải lên', icon: UploadCloud },
  { key: 'preview', label: 'Xem trước', icon: Eye },
  { key: 'parsing', label: 'Phân tích', icon: Cpu },
  { key: 'classifying', label: 'Phân loại', icon: Brain },
  { key: 'done', label: 'Hoàn tất', icon: CheckCircle2 },
];

function getStepIndex(step: ImportStep): number {
  return STEPS.findIndex((s) => s.key === step);
}

export function ImportFlowView() {
  const {
    step,
    bankCode,
    setBankCode,
    uploadResult,
    parseResult,
    classifyResult,
    loading,
    error,
    setError,
    upload,
    parse,
    classify,
    finish,
    reset,
  } = useImportFlow();

  const currentIdx = getStepIndex(step);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === currentIdx;
            const isDone = idx < currentIdx;
            const isFuture = idx > currentIdx;

            return (
              <div key={s.key} className="flex items-center">
                {idx > 0 && (
                  <div
                    className={clsx(
                      'w-12 md:w-20 h-px mx-2',
                      isDone ? 'bg-green-400' : 'bg-gray-200'
                    )}
                  />
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={clsx(
                      'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                      isActive && 'bg-indigo-600 border-indigo-600 text-white',
                      isDone && 'bg-green-500 border-green-500 text-white',
                      isFuture && 'bg-white border-gray-300 text-gray-400'
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={clsx(
                      'text-xs font-medium hidden md:block',
                      isActive && 'text-indigo-700',
                      isDone && 'text-green-700',
                      isFuture && 'text-gray-400'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      {step === 'upload' && (
        <UploadDropzone
          bankCode={bankCode}
          onBankCodeChange={setBankCode}
          onUpload={upload}
          loading={loading}
          error={error}
        />
      )}

      {step === 'preview' && uploadResult && (
        <div className="space-y-4">
          <ColumnMapper
            detectedColumns={uploadResult.detected_columns}
          />
          <ImportPreview
            uploadResult={uploadResult}
            onParse={() => parse()}
            loading={loading}
          />
        </div>
      )}

      {step === 'parsing' && parseResult && (
        <ParseStatus
          result={parseResult}
          onClassify={classify}
          loading={loading}
        />
      )}

      {step === 'classifying' && classifyResult && uploadResult && (
        <ClassifyStatus
          result={classifyResult}
          batchId={uploadResult.batch_id}
          onFinish={finish}
        />
      )}

      {step === 'done' && (
        <div className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Nhập dữ liệu hoàn tất!</h3>
          <p className="text-sm text-gray-500 mb-6">
            Lô dữ liệu đã được xử lý. Hãy vào trang Giao dịch để kiểm tra.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Nhập file mới
          </button>
        </div>
      )}

      {/* Error display for non-upload steps */}
      {error && step !== 'upload' && (
        <div className="flex items-center text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
          <span className="font-medium mr-2">Lỗi:</span>
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs text-red-500 hover:text-red-700 underline"
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  );
}
