import { useState, useCallback, useMemo } from 'react';
import type {
  TransactionListItem,
  TransactionFilters,
  Pagination,
  CategoryOption,
  BatchOption,
} from './types';
import { EMPTY_FILTERS } from './types';
import { useAppStore } from '@/lib/store';

const PAGE_SIZE = 50;

export function useTransactionList() {
  const activeBank = useAppStore((s) => s.activeBank);
  const bidvTransactions = useAppStore((s) => s.bidvTransactions);
  const agribankTransactions = useAppStore((s) => s.agribankTransactions);
  const setActiveBank = useAppStore((s) => s.setActiveBank);
  const categories = useAppStore((s) => s.categories);
  const batches = useAppStore((s) => s.batches);

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

  // Select transactions based on active bank tab
  const allTransactions = activeBank === 'BIDV' ? bidvTransactions : agribankTransactions;

  // Apply client-side filtering
  const filteredTransactions = useMemo(() => {
    let result = [...allTransactions];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.raw_desc?.toLowerCase().includes(q) ||
          t.sender_name?.toLowerCase().includes(q) ||
          t.raw_reference?.toLowerCase().includes(q)
      );
    }
    if (filters.batch_id) {
      result = result.filter((t) => t.batch_id === filters.batch_id);
    }
    if (filters.status) {
      result = result.filter((t) => t.status === filters.status);
    }
    if (filters.review_status) {
      result = result.filter((t) => t.match?.review_status === filters.review_status);
    }
    if (filters.type) {
      result = result.filter((t) => t.type === filters.type);
    }
    if (filters.suggested_category_id) {
      result = result.filter(
        (t) => t.match?.suggested_category_id === filters.suggested_category_id
      );
    }
    if (filters.confirmed_category_id) {
      result = result.filter(
        (t) => t.match?.confirmed_category_id === filters.confirmed_category_id
      );
    }
    if (filters.date_from) {
      result = result.filter((t) => t.normalized_date >= filters.date_from);
    }
    if (filters.date_to) {
      result = result.filter((t) => t.normalized_date <= filters.date_to);
    }
    if (filters.amount_min) {
      const min = parseFloat(filters.amount_min);
      if (!isNaN(min)) result = result.filter((t) => t.normalized_amount >= min);
    }
    if (filters.amount_max) {
      const max = parseFloat(filters.amount_max);
      if (!isNaN(max)) result = result.filter((t) => t.normalized_amount <= max);
    }

    return result;
  }, [allTransactions, filters]);

  // Paginated slice
  const pagedTransactions = useMemo(() => {
    const start = (pagination.page - 1) * pagination.page_size;
    return filteredTransactions.slice(start, start + pagination.page_size);
  }, [filteredTransactions, pagination.page, pagination.page_size]);

  // Keep pagination in sync with filtered count
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

  // Selection
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

  // Helper to get the store key for current bank
  const storeKey = activeBank === 'BIDV' ? 'bidvTransactions' : 'agribankTransactions';

  const mapTxns = useCallback(
    (mapper: (t: TransactionListItem) => TransactionListItem) => {
      const current = useAppStore.getState()[storeKey];
      useAppStore.setState({ [storeKey]: current.map(mapper) });
    },
    [storeKey]
  );

  // Bulk actions (in-memory)
  const bulkAssignCategory = useCallback(
    async (categoryId: string) => {
      setLoading(true);
      try {
        const cat = categories.find((c) => c.id === categoryId);
        mapTxns((t) => {
          if (!selectedIds.has(t.id)) return t;
          return {
            ...t,
            status: 'confirmed' as const,
            match: {
              ...(t.match || {
                suggested_category_id: null,
                suggested_category_code: null,
                suggested_category_name: null,
                confidence_score: 0,
                is_manually_overridden: false,
                review_status: 'pending' as const,
                reviewer_name: null,
              }),
              confirmed_category_id: categoryId,
              confirmed_category_code: cat?.code || null,
              confirmed_category_name: cat?.name || null,
              is_manually_overridden: true,
              review_status: 'approved' as const,
            },
          };
        });
        clearSelection();
      } finally {
        setLoading(false);
      }
    },
    [selectedIds, categories, clearSelection, mapTxns]
  );

  const bulkChangeReviewStatus = useCallback(
    async (reviewStatus: 'approved' | 'rejected') => {
      setLoading(true);
      try {
        mapTxns((t) => {
          if (!selectedIds.has(t.id) || !t.match) return t;
          return {
            ...t,
            match: { ...t.match, review_status: reviewStatus },
          };
        });
        clearSelection();
      } finally {
        setLoading(false);
      }
    },
    [selectedIds, clearSelection, mapTxns]
  );

  const bulkConfirm = useCallback(async () => {
    setLoading(true);
    try {
      mapTxns((t) => {
        if (!selectedIds.has(t.id) || !t.match) return t;
        return {
          ...t,
          status: 'confirmed' as const,
          match: {
            ...t.match,
            confirmed_category_id: t.match.suggested_category_id,
            confirmed_category_code: t.match.suggested_category_code,
            confirmed_category_name: t.match.suggested_category_name,
            review_status: 'approved' as const,
          },
        };
      });
      clearSelection();
    } finally {
      setLoading(false);
    }
  }, [selectedIds, clearSelection, mapTxns]);

  return {
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
    bidvCount: bidvTransactions.length,
    agribankCount: agribankTransactions.length,
    updateFilters,
    resetFilters,
    goToPage,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    bulkAssignCategory,
    bulkChangeReviewStatus,
    bulkConfirm,
  };
}
