import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CreditCard,
  Home,
  Layers,
  LogOut,
  Users,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { t, type Lang } from '../lib/i18n';

const navItems = [
  { to: '/admin', labelKey: 'dashboard', icon: Home },
  { to: '/admin/groups', labelKey: 'groups', icon: Layers },
  { to: '/admin/payments', labelKey: 'payments', icon: CreditCard },
  { to: '/admin/payouts', labelKey: 'payouts', icon: WalletCards },
  { to: '/admin/reports', labelKey: 'reports', icon: BarChart3 },
] as const;

export function AppLayout() {
  const lang: Lang = 'so';

  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const isAdmin = profile?.role === 'admin';

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  const displayName =
    profile?.full_name ||
    profile?.email ||
    profile?.phone ||
    'User';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar - unchanged for laptop */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white p-4 md:block">
        <Link
          to={isAdmin ? '/admin' : '/member'}
          className="flex items-center gap-3 rounded-2xl bg-brand-700 px-4 py-4 text-white"
        >
          <div className="rounded-xl bg-white/15 p-2">
            <Users size={22} />
          </div>

          <div>
            <p className="text-sm text-white/70">{t(lang, 'appName')}</p>
            <h1 className="font-bold">Hagbad System</h1>
          </div>
        </Link>

        <nav className="mt-6 space-y-1">
          {isAdmin ? (
            navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon size={18} />
                  {t(lang, item.labelKey)}
                </NavLink>
              );
            })
          ) : (
            <NavLink
              to="/member"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Home size={18} />
              {t(lang, 'dashboard')}
            </NavLink>
          )}
        </nav>
      </aside>

      <main className="min-h-screen md:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 md:text-xs">
                Welcome
              </p>

              <h2 className="truncate text-sm font-semibold text-slate-900 md:text-base">
                {displayName}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                {profile?.role}
              </span>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">{t(lang, 'logout')}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 pb-24 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className={isAdmin ? 'grid grid-cols-5 gap-1' : 'grid grid-cols-1 gap-1'}>
          {(isAdmin
            ? navItems
            : [{ to: '/member', labelKey: 'dashboard', icon: Home } as const]
          ).map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin' || item.to === '/member'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-500'
                  }`
                }
              >
                <Icon size={18} />
                <span className="max-w-full truncate">
                  {t(lang, item.labelKey)}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}