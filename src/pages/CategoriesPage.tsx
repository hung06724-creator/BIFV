import { CategoriesManagerView } from '@/components/features/categories/CategoriesManagerView';

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Danh mục các tài khoản</h1>
        <p className="text-sm text-gray-500">
          Quản lý danh mục tài khoản kế toán và các mã phân loại liên quan.
        </p>
      </div>
      <CategoriesManagerView />
    </div>
  );
}
