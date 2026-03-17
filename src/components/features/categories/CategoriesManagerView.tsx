import { useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Save, Search, ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/lib/store';
import { CATEGORY_GROUPS } from '@/components/features/rules/mock-data';
import type { CategoryOption } from '@/components/features/transactions/types';

interface CategoryFormData {
  code: string;
  name: string;
  group: string;
  ledger_account: string;
}

const EMPTY_FORM: CategoryFormData = { code: '', name: '', group: '', ledger_account: '' };

const GROUP_OPTIONS = [
  CATEGORY_GROUPS.DOANH_THU_DAO_TAO,
  CATEGORY_GROUPS.THU_NHAP_TAI_CHINH,
  CATEGORY_GROUPS.THU_HO_CHI_HO,
  CATEGORY_GROUPS.CHI_PHI_NOI_BO,
  'Khac',
];

const GROUP_COLORS: Record<string, { header: string; badge: string }> = {
  [CATEGORY_GROUPS.DOANH_THU_DAO_TAO]: {
    header: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  [CATEGORY_GROUPS.THU_NHAP_TAI_CHINH]: {
    header: 'border-blue-200 bg-blue-50 text-blue-800',
    badge: 'bg-blue-100 text-blue-700',
  },
  [CATEGORY_GROUPS.THU_HO_CHI_HO]: {
    header: 'border-amber-200 bg-amber-50 text-amber-800',
    badge: 'bg-amber-100 text-amber-700',
  },
  [CATEGORY_GROUPS.CHI_PHI_NOI_BO]: {
    header: 'border-gray-300 bg-gray-100 text-gray-700',
    badge: 'bg-gray-200 text-gray-600',
  },
  Khac: {
    header: 'border-purple-200 bg-purple-50 text-purple-800',
    badge: 'bg-purple-100 text-purple-700',
  },
};

function CategoryModal({
  editingId,
  formData,
  onChange,
  onClose,
  onSave,
}: {
  editingId: string | null;
  formData: CategoryFormData;
  onChange: (patch: Partial<CategoryFormData>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {editingId ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Cập nhật mã, tên và nhóm tài khoản ngay trong cửa sổ này.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tài khoản kế toán</label>
            <input
              type="text"
              value={formData.ledger_account}
              onChange={(e) => onChange({ ledger_account: e.target.value })}
              placeholder="VD: 5311.01"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Mã danh mục</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => onChange({ code: e.target.value })}
              placeholder="VD: HOC_PHI"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tên danh mục</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="VD: Học phí"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nhóm</label>
            <select
              value={formData.group}
              onChange={(e) => onChange({ group: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Chọn nhóm --</option>
              {GROUP_OPTIONS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-200"
          >
            Huỷ
          </button>
          <button
            onClick={onSave}
            disabled={!formData.code.trim() || !formData.name.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {editingId ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CategoriesManagerView() {
  const categories = useAppStore((s) => s.categories);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);

  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!searchQuery) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.ledger_account || '').toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, CategoryOption[]>();
    for (const g of GROUP_OPTIONS) map.set(g, []);
    for (const cat of filtered) {
      const group = cat.group || 'Khac';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(cat);
    }
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [filtered]);

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((cat: CategoryOption) => {
    setEditingId(cat.id);
    setFormData({
      code: cat.code,
      name: cat.name,
      group: cat.group || '',
      ledger_account: cat.ledger_account || '',
    });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.code.trim() || !formData.name.trim()) return;

    const data: CategoryOption = {
      id: editingId || `cat-${Date.now()}`,
      code: formData.code.trim(),
      name: formData.name.trim(),
      group: formData.group || 'Khac',
      ledger_account: formData.ledger_account.trim() || undefined,
    };

    if (editingId) {
      updateCategory(data);
    } else {
      addCategory(data);
    }

    closeForm();
  }, [editingId, formData, updateCategory, addCategory, closeForm]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteCategory(id);
      setDeleteConfirmId(null);
    },
    [deleteCategory]
  );

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
              Tổng: <span className="font-bold">{categories.length}</span> danh mục
            </span>
            <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700">
              {grouped.length} nhóm
            </span>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Thêm danh mục
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo TK, mã hoặc tên danh mục..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {grouped.map(([groupName, items]) => {
          const colors = GROUP_COLORS[groupName] || GROUP_COLORS.Khac;
          const isCollapsed = collapsedGroups.has(groupName);

          return (
            <div key={groupName} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <button
                onClick={() => toggleGroup(groupName)}
                className={clsx(
                  'flex w-full items-center gap-2 border-b px-5 py-3 text-left transition-colors',
                  colors.header
                )}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="flex-1 text-sm font-semibold">{groupName}</span>
                <span className={clsx('rounded-full px-2 py-0.5 text-xs font-bold', colors.badge)}>
                  {items.length}
                </span>
              </button>

              {!isCollapsed && (
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="w-24 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        TK
                      </th>
                      <th className="w-48 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Mã
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Tên danh mục
                      </th>
                      <th className="w-28 px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((cat) => (
                      <tr key={cat.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-mono text-gray-500">{cat.ledger_account || '-'}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex rounded bg-indigo-50 px-2 py-0.5 text-xs font-mono font-medium text-indigo-700">
                            {cat.code}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-800">{cat.name}</td>
                        <td className="px-4 py-2.5 text-right">
                          {deleteConfirmId === cat.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="mr-1 text-xs text-red-600">Xoá?</span>
                              <button
                                onClick={() => handleDelete(cat.id)}
                                className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
                              >
                                Xác nhận
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                              >
                                Huỷ
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(cat)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                                title="Chỉnh sửa"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(cat.id)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                title="Xoá"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">Không tìm thấy danh mục nào.</div>
        )}
      </div>

      {showForm && (
        <CategoryModal
          editingId={editingId}
          formData={formData}
          onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          onClose={closeForm}
          onSave={handleSave}
        />
      )}
    </>
  );
}
