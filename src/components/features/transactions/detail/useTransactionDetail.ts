import { useState, useCallback } from 'react';
import type { TransactionDetail, CategoryOption } from '../types';
import { MOCK_TRANSACTION_DETAIL, MOCK_CATEGORIES } from '../mock-data';

/**
 * Hook quản lý state cho Transaction Detail page.
 * Hiện tại dùng mock data — sau này thay bằng fetch API thật.
 */
export function useTransactionDetail(transactionId: string) {
  const [transaction, setTransaction] = useState<TransactionDetail | null>(
    MOCK_TRANSACTION_DETAIL.id === transactionId ? MOCK_TRANSACTION_DETAIL : MOCK_TRANSACTION_DETAIL
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories: CategoryOption[] = MOCK_CATEGORIES;

  // TODO: GET /api/transactions/[id]
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // const res = await fetch(`/api/transactions/${transactionId}`);
      // const data = await res.json();
      // setTransaction(data);
      setTransaction(MOCK_TRANSACTION_DETAIL);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  // TODO: PATCH /api/transactions/[id]
  const confirmClassification = useCallback(
    async (categoryId: string, reviewStatus: 'approved' | 'rejected', notes: string) => {
      setLoading(true);
      try {
        // const res = await fetch(`/api/transactions/${transactionId}`, {
        //   method: 'PATCH',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ confirmed_category_id: categoryId, review_status: reviewStatus, notes }),
        // });
        const cat = categories.find((c) => c.id === categoryId);
        setTransaction((prev) => {
          if (!prev || !prev.match) return prev;
          return {
            ...prev,
            status: 'confirmed',
            match: {
              ...prev.match,
              confirmed_category_id: categoryId,
              confirmed_category_code: cat?.code || null,
              confirmed_category_name: cat?.name || null,
              is_manually_overridden: categoryId !== prev.match.suggested_category_id,
              review_status: reviewStatus,
              reviewer_name: 'Bạn',
              reviewed_at: new Date().toISOString(),
            },
            audit_logs: [
              ...prev.audit_logs,
              {
                id: `audit-${Date.now()}`,
                action: categoryId !== prev.match.suggested_category_id ? 'manual_override' as const : 'update' as const,
                old_values: {
                  confirmed_category_id: prev.match.confirmed_category_id,
                  review_status: prev.match.review_status,
                },
                new_values: {
                  confirmed_category_id: categoryId,
                  review_status: reviewStatus,
                  ...(notes ? { notes } : {}),
                },
                user_id: 'current-user',
                user_name: 'Bạn',
                created_at: new Date().toISOString(),
              },
            ],
          };
        });
      } finally {
        setLoading(false);
      }
    },
    [transactionId, categories]
  );

  // TODO: POST /api/transactions/[id]/suggest
  const rerunSuggest = useCallback(async () => {
    setLoading(true);
    try {
      // const res = await fetch(`/api/transactions/${transactionId}/suggest`, { method: 'POST' });
      // Mock: just reload
      await new Promise((r) => setTimeout(r, 500));
      setTransaction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          audit_logs: [
            ...prev.audit_logs,
            {
              id: `audit-${Date.now()}`,
              action: 'update' as const,
              old_values: { action: 'rerun_suggest' },
              new_values: { suggested_category_id: prev.match?.suggested_category_id },
              user_id: null,
              user_name: 'Classification Engine',
              created_at: new Date().toISOString(),
            },
          ],
        };
      });
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  return {
    transaction,
    categories,
    loading,
    error,
    reload,
    confirmClassification,
    rerunSuggest,
  };
}
