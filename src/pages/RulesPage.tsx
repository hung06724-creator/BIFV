import { RulesManagerView } from '@/components/features/rules/RulesManagerView';

export default function RulesPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Quản lý Quy tắc phân loại</h1>
        <p className="text-sm text-gray-500">
          Tạo, chỉnh sửa và kiểm tra các quy tắc để phân loại giao dịch tự động.
        </p>
      </div>
      <RulesManagerView />
    </div>
  );
}
