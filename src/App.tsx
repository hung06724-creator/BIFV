import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/ui/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ImportsPage from './pages/ImportsPage';
import TransactionsPage from './pages/TransactionsPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import HistoryPage from './pages/HistoryPage';
import RulesPage from './pages/RulesPage';
import CategoriesPage from './pages/CategoriesPage';
import ExportsPage from './pages/ExportsPage';
import TuitionReportPage from './pages/TuitionReportPage';
import { useAppStore } from './lib/store';
import { useStudentStore } from './lib/studentStore';
import { useTuitionStore } from './lib/tuitionStore';

export default function App() {
  const hydrateFromServer = useAppStore((s) => s.hydrateFromServer);

  useEffect(() => {
    let cancelled = false;

    async function loadPersistedData() {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('bank-reconcile-storage');
      }

      try {
        const response = await fetch('/api/dev-data');
        if (!response.ok) return;

        const payload = await response.json();
        if (!cancelled && payload && typeof payload === 'object') {
          hydrateFromServer(payload);
          if (payload.students) {
            useStudentStore.getState().syncFromStorage(payload.students);
          }
          if (payload.tuitionRecords) {
            useTuitionStore.getState().syncFromStorage([], payload.tuitionRecords);
          }
        }
      } catch {
        // Keep local defaults if the dev-data API is unavailable.
      }
    }

    void loadPersistedData();

    return () => {
      cancelled = true;
    };
  }, [hydrateFromServer]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 bg-gray-50 min-h-screen">
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
      </main>
    </div>
  );
}
