import { useState, useCallback, useMemo } from 'react';
import type { RuleListItem, RuleFormData, CategoryOption, RuleTestResult } from './types';
import { EMPTY_FORM, CONFIDENCE_MAP } from './types';
import { removeVietnameseTones } from '@/lib/parsers/VietnameseTransactionParser';
import { useAppStore } from '@/lib/store';

export function useRulesManager() {
  const rules = useAppStore((s) => s.rules);
  const storeCategories = useAppStore((s) => s.categories);
  const addRule = useAppStore((s) => s.addRule);
  const updateRule = useAppStore((s) => s.updateRule);
  const deleteRuleInStore = useAppStore((s) => s.deleteRule);

  const [editingRule, setEditingRule] = useState<RuleListItem | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: CategoryOption[] = useMemo(
    () =>
      [...storeCategories]
        .map((category) => ({
          id: category.id,
          code: category.code,
          name: category.name,
        }))
        .sort((a, b) => a.code.localeCompare(b.code, 'vi')),
    [storeCategories]
  );

  const filteredRules = useMemo(() => {
    let result = [...rules].sort((a, b) => a.priority - b.priority);
    if (filterType) result = result.filter((r) => r.type === filterType);
    if (filterActive === 'true') result = result.filter((r) => r.is_active);
    if (filterActive === 'false') result = result.filter((r) => !r.is_active);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.keyword.toLowerCase().includes(q) ||
          r.category_name.toLowerCase().includes(q) ||
          r.category_code.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rules, filterType, filterActive, searchQuery]);

  const openCreateForm = useCallback(() => {
    setEditingRule(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((rule: RuleListItem) => {
    setEditingRule(rule);
    setFormData({
      category_id: rule.category_id,
      keyword: rule.keyword,
      type: rule.type,
      priority: rule.priority,
      amount_min: rule.amount_min != null ? String(rule.amount_min) : '',
      amount_max: rule.amount_max != null ? String(rule.amount_max) : '',
      stop_on_match: rule.stop_on_match,
      is_active: rule.is_active,
    });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingRule(null);
    setFormData(EMPTY_FORM);
  }, []);

  const updateFormField = useCallback(<K extends keyof RuleFormData>(key: K, value: RuleFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveRule = useCallback(async () => {
    setLoading(true);
    try {
      const cat = categories.find((c) => c.id === formData.category_id);
      const now = new Date().toISOString();

      if (editingRule) {
        // Update
        updateRule({
          ...editingRule,
          category_id: formData.category_id,
          category_code: cat?.code || editingRule.category_code,
          category_name: cat?.name || editingRule.category_name,
          keyword: formData.keyword,
          type: formData.type,
          priority: formData.priority,
          amount_min: formData.amount_min ? parseFloat(formData.amount_min) : null,
          amount_max: formData.amount_max ? parseFloat(formData.amount_max) : null,
          stop_on_match: formData.stop_on_match,
          is_active: formData.is_active,
          updated_at: now,
        });
      } else {
        // Create
        const newRule: RuleListItem = {
          id: `rule-${Date.now()}`,
          category_id: formData.category_id,
          category_code: cat?.code || '',
          category_name: cat?.name || '',
          keyword: formData.keyword,
          type: formData.type,
          priority: formData.priority,
          amount_min: formData.amount_min ? parseFloat(formData.amount_min) : null,
          amount_max: formData.amount_max ? parseFloat(formData.amount_max) : null,
          conditions: null,
          stop_on_match: formData.stop_on_match,
          is_active: formData.is_active,
          match_count: 0,
          created_at: now,
          updated_at: now,
        };
        addRule(newRule);
      }
      closeForm();
    } finally {
      setLoading(false);
    }
  }, [formData, editingRule, categories, closeForm, addRule, updateRule]);

  const deleteRule = useCallback(async (id: string) => {
    deleteRuleInStore(id);
  }, [deleteRuleInStore]);

  const toggleActive = useCallback(async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      updateRule({
        ...rule,
        is_active: !rule.is_active,
        updated_at: new Date().toISOString(),
      });
    }
  }, [rules, updateRule]);

  // Client-side rule tester remains the same as it tests against current formData
  const testRule = useCallback(
    (description: string, amount: number): RuleTestResult => {
      const normalized = description.replace(/\s+/g, ' ').trim().toLowerCase();
      const searchString = removeVietnameseTones(normalized);

      // Test against current form data
      const rule = formData;
      let matched = false;

      switch (rule.type) {
        case 'exact':
          matched = searchString === rule.keyword.toLowerCase();
          break;
        case 'regex':
          try {
            matched = new RegExp(rule.keyword, 'i').test(searchString);
          } catch {
            return { matched: false, confidence_score: 0, explanation: 'Regex không hợp lệ.', search_string: searchString };
          }
          break;
        case 'keyword': {
          const kws = rule.keyword.toLowerCase().split('|').map((k) => k.trim()).filter(Boolean);
          matched = kws.some((kw) => searchString.includes(kw));
          break;
        }
        case 'amount': {
          const min = rule.amount_min ? parseFloat(rule.amount_min) : undefined;
          const max = rule.amount_max ? parseFloat(rule.amount_max) : undefined;
          const meetsMin = min !== undefined ? amount >= min : true;
          const meetsMax = max !== undefined ? amount <= max : true;
          matched = meetsMin && meetsMax;
          break;
        }
        case 'composite': {
          const kws = rule.keyword.toLowerCase().split('|').map((k) => k.trim()).filter(Boolean);
          const hasKw = kws.length > 0 ? kws.some((kw) => searchString.includes(kw)) : true;
          const min = rule.amount_min ? parseFloat(rule.amount_min) : undefined;
          const max = rule.amount_max ? parseFloat(rule.amount_max) : undefined;
          const meetsMin = min !== undefined ? amount >= min : true;
          const meetsMax = max !== undefined ? amount <= max : true;
          matched = hasKw && meetsMin && meetsMax;
          break;
        }
        case 'fallback':
          matched = true;
          break;
      }

      const confidence = matched ? CONFIDENCE_MAP[rule.type] : 0;
      const explanation = matched
        ? `✅ Khớp rule [${rule.type}]: '${rule.keyword || '(fallback)'}'. Confidence: ${Math.round(confidence * 100)}%`
        : `❌ Không khớp. Search string: "${searchString}"`;

      return { matched, confidence_score: confidence, explanation, search_string: searchString };
    },
    [formData]
  );

  return {
    rules: filteredRules,
    totalRules: rules.length,
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
  };
}
