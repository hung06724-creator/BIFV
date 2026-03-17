import { ImportFlowView } from '@/components/features/imports/ImportFlowView';

export default function ImportsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Nhập Sổ phụ ngân hàng</h1>
        <p className="text-sm text-gray-500">
          Tải lên file Excel/CSV sao kê, hệ thống tự động phân tích và phân loại giao dịch.
        </p>
      </div>
      <ImportFlowView />
    </div>
  );
}
