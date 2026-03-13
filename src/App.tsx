import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/ui/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ImportsPage from './pages/ImportsPage';
import TransactionsPage from './pages/TransactionsPage';
import HistoryPage from './pages/HistoryPage';
import RulesPage from './pages/RulesPage';
import CategoriesPage from './pages/CategoriesPage';
import ExportsPage from './pages/ExportsPage';

export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 bg-gray-50 min-h-screen">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/imports" element={<ImportsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/exports" element={<ExportsPage />} />
        </Routes>
      </main>
    </div>
  );
}
