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
  GraduationCap,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tổng quan', href: '/', icon: <LayoutDashboard size={18} /> },
  { label: 'Nhập sổ phụ', href: '/imports', icon: <Upload size={18} /> },
  { label: 'Giao dịch', href: '/transactions', icon: <List size={18} /> },
  { label: 'Lịch sử GD', href: '/history', icon: <History size={18} /> },
  { label: 'Quy tắc', href: '/rules', icon: <BookOpen size={18} /> },
  { label: 'Danh mục', href: '/categories', icon: <FolderTree size={18} /> },
  { label: 'Xuất báo cáo', href: '/exports', icon: <Download size={18} /> },
  { label: 'Tổng hợp học phí', href: '/tuition', icon: <GraduationCap size={18} /> },
];

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="w-60 h-screen bg-[var(--brand-primary)] text-gray-100 flex flex-col fixed left-0 top-0">
      <div className="px-4 py-4 border-b border-[var(--brand-border)]">
        <div className="flex items-center gap-3 mb-2">
          <img
            src="/group-4.png"
            alt="HNIVC"
            className="h-10 w-auto rounded"
          />
          <span className="text-base font-bold">HNIVC</span>
        </div>
        <h1 className="text-sm font-bold leading-tight">Tra soát Sổ phụ</h1>
        <p className="text-[10px] text-gray-300 mt-0.5">Hệ thống nội bộ</p>
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
                  ? 'bg-[var(--brand-primary-dark)] text-white'
                  : 'text-gray-300 hover:bg-[var(--brand-primary-light)] hover:text-white'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--brand-border)] px-4 py-3">
        <p className="text-xs text-gray-300">HNIVC © 2025</p>
      </div>
    </aside>
  );
}
