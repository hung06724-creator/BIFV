import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Upload,
  List,
  History,
  BookOpen,
  Download,
  FolderTree,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard size={18} /> },
  { label: 'Import', href: '/imports', icon: <Upload size={18} /> },
  { label: 'Giao dịch', href: '/transactions', icon: <List size={18} /> },
  { label: 'Lịch sử GD', href: '/history', icon: <History size={18} /> },
  { label: 'Quy tắc', href: '/rules', icon: <BookOpen size={18} /> },
  { label: 'Danh mục', href: '/categories', icon: <FolderTree size={18} /> },
  { label: 'Xuất báo cáo', href: '/exports', icon: <Download size={18} /> },
];

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="w-60 h-screen bg-gray-900 text-gray-100 flex flex-col fixed left-0 top-0">
      <div className="px-4 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold">Đối soát NH</h1>
        <p className="text-xs text-gray-400 mt-1">Bank Reconciliation</p>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 px-4 py-3">
        <p className="text-xs text-gray-400">Local Mode</p>
      </div>
    </aside>
  );
}
