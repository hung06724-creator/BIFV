import { clsx } from 'clsx';
import {
  BookOpen,
  Download,
  FolderTree,
  GraduationCap,
  History,
  LayoutDashboard,
  List,
  Upload,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

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

function isItemActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside
      className="fixed left-0 top-0 flex h-screen w-60 flex-col text-white"
      style={{
        background: 'linear-gradient(180deg, var(--sidebar-bg) 0%, var(--sidebar-hover) 100%)',
      }}
    >
      <div className="border-b px-4 py-5" style={{ borderColor: 'rgba(217, 226, 220, 0.16)' }}>
        <div className="flex flex-col gap-3">
          <img
            src="/group-4.png"
            alt="HNIVC"
            className="h-10 w-auto max-w-[120px] rounded-xl bg-white p-1 shadow-[0_6px_18px_rgba(0,0,0,0.18)]"
          />
          <div className="min-w-0">
            <div className="text-[1.65rem] font-bold leading-8 text-white">Tra soát Sổ phụ</div>
            <p className="mt-1 text-[1.05rem] font-medium leading-6" style={{ color: '#dce8e3' }}>
              Hệ thống nội bộ
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-2.5 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = isItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={clsx(
                'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200',
                isActive
                  ? 'font-semibold text-white shadow-[0_10px_30px_rgba(22,50,45,0.28)]'
                  : 'hover:bg-white/[0.05] hover:text-white'
              )}
              style={
                isActive
                  ? {
                      background: 'linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%)',
                    }
                  : {
                      color: '#e2ece8',
                    }
              }
            >
              <span
                className={clsx(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                  isActive
                    ? 'bg-transparent text-white'
                    : 'group-hover:bg-white/[0.06] group-hover:text-white'
                )}
                style={isActive ? undefined : { color: '#dce8e3' }}
              >
                {item.icon}
              </span>
              <span className="truncate text-[15px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-4 py-4" style={{ borderColor: 'rgba(217, 226, 220, 0.16)' }}>
        <p className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: '#9eb5ad' }}>
          HNIVC © 2025
        </p>
      </div>
    </aside>
  );
}
