import { useState, useCallback, useMemo } from 'react';
import type {
  TransactionListItem,
  TransactionFilters,
  Pagination,
} from './types';
import { EMPTY_FILTERS } from './types';
import { useAppStore } from '@/lib/store';
import { ClassificationService } from '@/services/classification.service';
import { AllocationService } from '@/services/allocation.service';
import type { BankTransaction } from '@/domain/types';

const PAGE_SIZE = 50;
const classifier = new ClassificationService();
const allocationService = new AllocationService();

export function useTransactionList() {
  const activeBank = useAppStore((s) => s.activeBank);
  const bidvTransactions = useAppStore((s) => s.bidvTransactions);
  const agribankTransactions = useAppStore((s) => s.agribankTransactions);
  const setActiveBank = useAppStore((s) => s.setActiveBank);
  const categories = useAppStore((s) => s.categories);
  const batches = useAppStore((s) => s.batches);
  const rules = useAppStore((s) => s.rules);
  const updateTransactionsInStore = useAppStore((s) => s.updateTransactions);

  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    page_size: PAGE_SIZE,
    total_items: 0,
    total_pages: 1,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bankTransactions = activeBank === 'BIDV' ? bidvTransactions : agribankTransactions;
  const allTransactions = useMemo(() => bankTransactions.filter((t) => t.type === 'credit'), [bankTransactions]);

  const bidvCreditCount = useMemo(
    () => bidvTransactions.reduce((n, t) => n + (t.type === 'credit' ? 1 : 0), 0),
    [bidvTransactions]
  );
  const agribankCreditCount = useMemo(
    () => agribankTransactions.reduce((n, t) => n + (t.type === 'credit' ? 1 : 0), 0),
    [agribankTransactions]
  );

  const filteredTransactions = useMemo(() => {
    let result = [...allTransactions];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.raw_desc?.toLowerCase().includes(q) ||
          t.sender_name?.toLowerCase().includes(q) ||
          t.raw_reference?.toLowerCase().includes(q) ||
          t.allocations.some((allocation) => allocation.beneficiary_name?.toLowerCase().includes(q))
      );
    }
    if (filters.batch_id) {
      result = result.filter((t) => t.batch_id === filters.batch_id);
    }
    if (filters.status) {
      result = result.filter((t) => t.status === filters.status);
    }
    if (filters.type) {
      result = result.filter((t) => t.type === filters.type);
    }
    if (filters.split_mode) {
      result = result.filter((t) => t.split_mode === filters.split_mode);
    }
    if (filters.needs_review) {
      result = result.filter((t) => t.split_mode !== 'direct');
    }
    if (filters.suggested_category_id) {
      result = result.filter((t) =>
        t.allocations.some((allocation) => allocation.suggested_category_id === filters.suggested_category_id)
      );
    }
    if (filters.confirmed_category_id) {
      result = result.filter((t) =>
        t.allocations.some((allocation) => allocation.confirmed_category_id === filters.confirmed_category_id)
      );
    }
    if (filters.date_from) {
      result = result.filter((t) => t.normalized_date >= filters.date_from);
    }
    if (filters.date_to) {
      result = result.filter((t) => t.normalized_date <= filters.date_to);
    }
    if (filters.amount_min) {
      const min = Number.parseFloat(filters.amount_min);
      if (!Number.isNaN(min)) result = result.filter((t) => t.normalized_amount >= min);
    }
    if (filters.amount_max) {
      const max = Number.parseFloat(filters.amount_max);
      if (!Number.isNaN(max)) result = result.filter((t) => t.normalized_amount <= max);
    }

    return result;
  }, [allTransactions, filters]);

  const pagedTransactions = useMemo(() => {
    const start = (pagination.page - 1) * pagination.page_size;
    return filteredTransactions.slice(start, start + pagination.page_size);
  }, [filteredTransactions, pagination.page, pagination.page_size]);

  const currentPagination = useMemo<Pagination>(
    () => ({
      ...pagination,
      total_items: filteredTransactions.length,
      total_pages: Math.max(1, Math.ceil(filteredTransactions.length / pagination.page_size)),
    }),
    [filteredTransactions.length, pagination]
  );

  const updateFilters = useCallback((patch: Partial<TransactionFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === pagedTransactions.length) return new Set();
      return new Set(pagedTransactions.map((t) => t.id));
    });
  }, [pagedTransactions]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const mapTxns = useCallback(
    (mapper: (t: TransactionListItem) => TransactionListItem) => {
      updateTransactionsInStore(activeBank, mapper);
    },
    [activeBank, updateTransactionsInStore]
  );

  const bulkAssignCategory = useCallback(
    async (categoryId: string) => {
      setLoading(true);
      try {
        const category = categories.find((c) => c.id === categoryId);
        mapTxns((t) => {
          if (!selectedIds.has(t.id)) return t;
          return allocationService.applyTransactionCategorySelection(t, category, true);
        });
        clearSelection();
      } finally {
        setLoading(false);
      }
    },
    [selectedIds, categories, clearSelection, mapTxns]
  );

  const bulkConfirm = useCallback(async () => {
    setLoading(true);
    try {
      mapTxns((t) => {
        if (!selectedIds.has(t.id)) return t;
        const allocations = t.allocations.map((allocation) => ({
          ...allocation,
          confirmed_category_id: allocation.confirmed_category_id || allocation.suggested_category_id,
          confirmed_category_code: allocation.confirmed_category_code || allocation.suggested_category_code,
          confirmed_category_name: allocation.confirmed_category_name || allocation.suggested_category_name,
          status:
            allocation.confirmed_category_id || allocation.suggested_category_id ? 'confirmed' : allocation.status,
        }));

        return {
          ...t,
          allocations,
          status: allocationService.deriveStatus(t.status, t.normalized_amount, t.split_mode, allocations),
          match: allocationService.deriveMatch(allocations),
        };
      });
      clearSelection();
    } finally {
      setLoading(false);
    }
  }, [selectedIds, clearSelection, mapTxns]);

  const updateCategory = useCallback(
    (transactionId: string, categoryId: string) => {
      const category = categories.find((c) => c.id === categoryId);
      mapTxns((t) => {
        if (t.id !== transactionId) return t;
        // Direct + pending: user manually picks category → auto confirm
        const autoConfirm = t.split_mode === 'direct' && t.status === 'pending_classification';
        return allocationService.applyTransactionCategorySelection(t, category, autoConfirm);
      });
    },
    [categories, mapTxns]
  );

  const confirmTransaction = useCallback(
    (transactionId: string) => {
      mapTxns((t) => {
        if (t.id !== transactionId) return t;
        const allocations = allocationService.confirmAllocations(t.allocations);
        return {
          ...t,
          allocations,
          status: allocationService.deriveStatus(t.status, t.normalized_amount, t.split_mode, allocations),
          match: allocationService.deriveMatch(allocations),
        };
      });
    },
    [mapTxns]
  );

  const updateSplitMode = useCallback(
    (transactionId: string, splitMode: TransactionListItem['split_mode']) => {
      mapTxns((t) => {
        if (t.id !== transactionId) return t;
        return allocationService.applySplitModeSelection(t, splitMode);
      });
    },
    [mapTxns]
  );

  const reclassify = useCallback(async () => {
    setLoading(true);
    try {
      const currentRules = rules.map((r) => ({
        ...r,
        amount_min: r.amount_min ?? undefined,
        amount_max: r.amount_max ?? undefined,
      }));

      mapTxns((t) => {
        if (t.status === 'confirmed' || t.status === 'exported' || t.status === 'classified' || t.type === 'debit') return t;

        const allocations = t.allocations.map((allocation) => {
          if (allocation.confirmed_category_id) {
            return allocation;
          }

          const matchResult = classifier.evaluateRules(t as unknown as BankTransaction, currentRules as any);
          if (!matchResult.suggested_category_id) {
            return {
              ...allocation,
              suggested_category_id: null,
              suggested_category_code: null,
              suggested_category_name: null,
              status: 'draft' as const,
            };
          }

          const category = categories.find((c) => c.id === matchResult.suggested_category_id);
          return {
            ...allocation,
            suggested_category_id: matchResult.suggested_category_id,
            suggested_category_code: matchResult.suggested_category_code || category?.code || null,
            suggested_category_name: category?.name || null,
            status: 'classified' as const,
          };
        });

        return {
          ...t,
          allocations,
          status: allocationService.deriveStatus(t.status, t.normalized_amount, t.split_mode, allocations),
          match: allocationService.deriveMatch(allocations),
        };
      });
    } finally {
      setLoading(false);
    }
  }, [rules, categories, mapTxns]);

  return {
    allTransactions,
    filteredTransactions,
    transactions: pagedTransactions,
    pagination: currentPagination,
    filters,
    selectedIds,
    categories,
    batches,
    loading,
    error,
    activeBank,
    setActiveBank,
    bidvCount: bidvCreditCount,
    agribankCount: agribankCreditCount,
    updateFilters,
    resetFilters,
    goToPage,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    updateCategory,
    confirmTransaction,
    updateSplitMode,
    bulkAssignCategory,
    bulkConfirm,
    reclassify,
  };
}
