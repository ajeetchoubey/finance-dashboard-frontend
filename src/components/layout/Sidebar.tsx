import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, LogOut, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard.read' as const,
  },
  {
    to: '/records',
    label: 'Records',
    icon: FileText,
    permission: 'records.read' as const,
  },
  {
    to: '/users',
    label: 'Users',
    icon: Users,
    permission: 'users.manage' as const,
  },
];

export function Sidebar() {
  const { user, logout, can } = useAuthStore();

  return (
    <aside className="flex h-screen w-60 flex-col bg-gray-950 text-slate-300">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <TrendingUp size={16} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-white tracking-wide">FinanceDesk</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-3 overflow-y-auto">
        {navItems
          .filter((item) => can(item.permission))
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="mb-2 rounded-lg px-3 py-2">
          <p className="text-xs font-medium text-white truncate">{user?.name}</p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-slate-400 capitalize">
            {user?.role}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
