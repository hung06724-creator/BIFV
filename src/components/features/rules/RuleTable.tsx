import {
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  OctagonX,
  Search,
  Filter,
} from 'lucide-react';
import clsx from 'clsx';
import type { RuleListItem } from './types';
import { RULE_TYPE_OPTIONS, CONFIDENCE_MAP } from './types';

interface RuleTableProps {
  rules: RuleListItem[];
  totalRules: number;
  filterType: string;
  filterActive: string;
  searchQuery: string;
  onFilterType: (v: string) => void;
  onFilterActive: (v: string) => void;
  onSearch: (v: string) => void;
  onEdit: (rule: RuleListItem) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
}

const VN_NUMBER = new Intl.NumberFormat('vi-VN');

function TypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    exact: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    keyword: 'bg-blue-100 text-blue-700 border-blue-200',
    regex: 'bg-purple-100 text-purple-700 border-purple-200',
    amount: 'bg-amber-100 text-amber-700 border-amber-200',
    composite: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    fallback: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border', colorMap[type] || colorMap.fallback)}>
      {type}
    </span>
  );
}

export function RuleTable({
  rules,
  totalRules,
  filterType,
  filterActive,
  searchQuery,
  onFilterType,
  onFilterActive,
  onSearch,
  onEdit,
  onDelete,
  onToggleActive,
}: RuleTableProps) {
  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm từ khoá, danh mục..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => onFilterType(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả loại</option>
            {RULE_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={filterActive}
            onChange={(e) => onFilterActive(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Hoạt động</option>
            <option value="false">Không hoạt động</option>
          </select>
        </div>
        <span className="text-xs text-gray-400">
          {rules.length}/{totalRules} quy tắc
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-16">Pri.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Loại</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mẫu / Từ khoá</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Danh mục</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Conf.</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Khoảng tiền</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-16">Stop</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-16">Active</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-16">Hits</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-24">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-gray-500">
                    Không tìm thấy rule nào.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className={clsx(
                      'hover:bg-gray-50 transition-colors',
                      !rule.is_active && 'opacity-50 bg-gray-50/50'
                    )}
                  >
                    {/* Priority */}
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-bold font-mono text-gray-700">
                        {rule.priority}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-2.5">
                      <TypeBadge type={rule.type} />
                    </td>

                    {/* Pattern */}
                    <td className="px-4 py-2.5">
                      {rule.keyword ? (
                        <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 break-all">
                          {rule.keyword}
                        </code>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          {rule.type === 'fallback' ? '(luôn khớp)' : '(không có)'}
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-gray-800 font-medium">{rule.category_name}</span>
                    </td>

                    {/* Confidence */}
                    <td className="px-4 py-2.5 text-center">
                      <span className={clsx(
                        'inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-bold',
                        CONFIDENCE_MAP[rule.type] >= 0.85
                          ? 'bg-green-100 text-green-700'
                          : CONFIDENCE_MAP[rule.type] >= 0.5
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      )}>
                        {Math.round(CONFIDENCE_MAP[rule.type] * 100)}%
                      </span>
                    </td>

                    {/* Amount range */}
                    <td className="px-4 py-2.5 text-center text-xs font-mono text-gray-600">
                      {rule.amount_min != null || rule.amount_max != null ? (
                        <span>
                          {rule.amount_min != null ? VN_NUMBER.format(rule.amount_min) : '0'}
                          {' → '}
                          {rule.amount_max != null ? VN_NUMBER.format(rule.amount_max) : '∞'}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Stop on match */}
                    <td className="px-4 py-2.5 text-center">
                      {rule.stop_on_match ? (
                        <OctagonX className="w-4 h-4 text-red-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => onToggleActive(rule.id)}
                        className="focus:outline-none"
                      >
                        {rule.is_active ? (
                          <ToggleRight className="w-5 h-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>

                    {/* Match count */}
                    <td className="px-4 py-2.5 text-center text-xs font-mono text-gray-500">
                      {rule.match_count}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEdit(rule)}
                          className="btn btn-sm btn-ghost rounded p-1.5 text-[var(--primary)]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Xoá rule "${rule.keyword || rule.type}"?`)) onDelete(rule.id);
                          }}
                          className="btn btn-sm btn-ghost rounded p-1.5 text-[var(--danger)]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
