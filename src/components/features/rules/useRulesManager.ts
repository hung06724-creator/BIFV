import { useState, useCallback, useMemo } from 'react';
import type { RuleListItem, RuleFormData, CategoryOption, RuleTestResult } from './types';
import { EMPTY_FORM, CONFIDENCE_MAP } from './types';
import { MOCK_RULES, MOCK_CATEGORIES } from './mock-data';
import { removeVietnameseTones } from '@/lib/parsers/VietnameseTransactionParser';

export function useRulesManager() {
  const [rules, setRules] = useState<RuleListItem[]>(MOCK_RULES);
  const [editingRule, setEditingRule] = useState<RuleListItem | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: CategoryOption[] = MOCK_CATEGORIES;

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

  // TODO: POST /api/rules or PATCH /api/rules/[id]
  const saveRule = useCallback(async () => {
    setLoading(true);
    try {
      const cat = categories.find((c) => c.id === formData.category_id);
      const now = new Date().toISOString();

      if (editingRule) {
        // Update
        setRules((prev) =>
          prev.map((r) =>
            r.id === editingRule.id
              ? {
                  ...r,
                  category_id: formData.category_id,
                  category_code: cat?.code || r.category_code,
                  category_name: cat?.name || r.category_name,
                  keyword: formData.keyword,
                  type: formData.type,
                  priority: formData.priority,
                  amount_min: formData.amount_min ? parseFloat(formData.amount_min) : null,
                  amount_max: formData.amount_max ? parseFloat(formData.amount_max) : null,
                  stop_on_match: formData.stop_on_match,
                  is_active: formData.is_active,
                  updated_at: now,
                }
              : r
          )
        );
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
        setRules((prev) => [...prev, newRule]);
      }
      closeForm();
    } finally {
      setLoading(false);
    }
  }, [formData, editingRule, categories, closeForm]);

  // TODO: DELETE /api/rules/[id]
  const deleteRule = useCallback(async (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleActive = useCallback(async (id: string) => {
    // TODO: PATCH /api/rules/[id]
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active, updated_at: new Date().toISOString() } : r))
    );
  }, []);

  // Client-side rule tester using the same logic as ClassificationService
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
