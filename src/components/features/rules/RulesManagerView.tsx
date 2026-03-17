import { Plus } from 'lucide-react';
import { useRulesManager } from './useRulesManager';
import { RuleTable } from './RuleTable';
import { RuleForm } from './RuleForm';
import { RuleTester } from './RuleTester';

export function RulesManagerView() {
  const {
    rules,
    totalRules,
    categories,
    editingRule,
    formData,
    showForm,
    loading,
    filterType,
    filterActive,
    searchQuery,
    setFilterType,
    setFilterActive,
    setSearchQuery,
    openCreateForm,
    openEditForm,
    closeForm,
    updateFormField,
    saveRule,
    deleteRule,
    toggleActive,
    testRule,
  } = useRulesManager();

  return (
    <div className="space-y-5">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
            Tổng: <span className="font-bold">{totalRules}</span> quy tắc
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-medium">
            Hoạt động: <span className="font-bold">{rules.filter((r) => r.is_active).length}</span>
          </span>
        </div>
        {!showForm && (
          <button
            onClick={openCreateForm}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo quy tắc mới
          </button>
        )}
      </div>

      {/* Form (create/edit) + Tester */}
      {showForm && (
        <div className="space-y-4">
          <RuleForm
            formData={formData}
            categories={categories}
            editingRule={editingRule}
            loading={loading}
            onFieldChange={updateFormField}
            onSave={saveRule}
            onClose={closeForm}
          />
          <RuleTester onTest={testRule} />
        </div>
      )}

      {/* Rules table */}
      <RuleTable
        rules={rules}
        totalRules={totalRules}
        filterType={filterType}
        filterActive={filterActive}
        searchQuery={searchQuery}
        onFilterType={setFilterType}
        onFilterActive={setFilterActive}
        onSearch={setSearchQuery}
        onEdit={openEditForm}
        onDelete={deleteRule}
        onToggleActive={toggleActive}
      />
    </div>
  );
}
