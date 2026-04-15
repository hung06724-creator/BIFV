import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/ui/Sidebar';
import { useAppStore } from './lib/store';
import { useStudentStore } from './lib/studentStore';
import { useTuitionStore } from './lib/tuitionStore';
import {
  getLastRuntimeStateMutationAt,
  hasPendingRuntimeStatePersist,
  isSupabaseRuntimeReady,
  loadRuntimeStateFromDevApi,
  loadRuntimeStateFromSupabase,
  subscribeRuntimeStateChanges,
} from './services/runtimeState.service';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ImportsPage = lazy(() => import('./pages/ImportsPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const TransactionDetailPage = lazy(() => import('./pages/TransactionDetailPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const RulesPage = lazy(() => import('./pages/RulesPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const ExportsPage = lazy(() => import('./pages/ExportsPage'));
const TuitionReportPage = lazy(() => import('./pages/TuitionReportPage'));

export default function App() {
  const hydrateFromServer = useAppStore((s) => s.hydrateFromServer);

  useEffect(() => {
    let cancelled = false;
    let unsubRealtime: (() => void) | null = null;
    let loading = false;

    async function loadPersistedData() {
      if (loading) return;
      loading = true;
      const requestStartedAt = Date.now();

      try {
        const payload = isSupabaseRuntimeReady()
          ? await loadRuntimeStateFromSupabase()
          : await loadRuntimeStateFromDevApi();

        if (!cancelled && payload && typeof payload === 'object') {
          if (hasPendingRuntimeStatePersist() || getLastRuntimeStateMutationAt() > requestStartedAt) {
            return;
          }

          hydrateFromServer(payload);

          if (payload.students) {
            useStudentStore.getState().syncFromStorage(payload.students);
          }

          if (payload.tuitionRecords) {
            useTuitionStore.getState().syncSavedFromStorage(payload.tuitionRecords);
          }
        }
      } catch (error) {
        console.error('Failed to load persisted runtime state.', error);
      } finally {
        loading = false;
      }
    }

    void loadPersistedData();

    if (isSupabaseRuntimeReady()) {
      unsubRealtime = subscribeRuntimeStateChanges(() => {
        if (cancelled) return;
        void loadPersistedData();
      });
    }

    return () => {
      cancelled = true;
      if (unsubRealtime) {
        unsubRealtime();
      }
    };
  }, [hydrateFromServer]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className="ml-60 min-h-screen flex-1"
        style={{ backgroundColor: 'var(--background)', color: 'var(--text-main)' }}
      >
        <Suspense
          fallback={
            <div className="p-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              Đang tải trang...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/imports" element={<ImportsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/transactions/:transactionId" element={<TransactionDetailPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/exports" element={<ExportsPage />} />
            <Route path="/tuition" element={<TuitionReportPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
