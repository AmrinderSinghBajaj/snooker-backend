import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useTranslation } from '../utils/translations';
import Logo from './Logo';

/*
  FRD B.1 - Main Dashboard View:
    Top Left: Club Name
    Top Right: User's Name with label "Club Owner" underneath
    Left Navigation Menu (in order):
      Dashboard, Customer Section, Billing Section, Table and PlayStation Section,
      Food and Drink, Revenue Section, Setting Section, Tournament (Future)
*/
const NAV_ITEMS = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/customers', key: 'customers', label: 'Customer Section' },
  { to: '/billing', key: 'billing', label: 'Billing Section' },
  { to: '/tables', key: 'tablesPlaystation', label: 'Table and PlayStation Section' },
  { to: '/food', key: 'foodDrink', label: 'Food and Drink' },
  { to: '/advance-payments', key: 'advancePayments', label: 'Advance Payment Customers' },
  { to: '/revenue', key: 'revenue', label: 'Revenue Section' },
  { to: '/settings', key: 'settings', label: 'Setting Section' },
  { to: '/tournament', key: 'tournament', label: 'Tournament', future: true },
];

export default function AppShell() {
  const { admin, logout } = useAuth();
  const { club_name } = useBranding();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell" style={styles.shell}>
      <header className="app-topbar" style={styles.topbar}>
        <div style={styles.brandBlock}>
          <Logo size={32} />
          <div style={styles.clubName}>{club_name}</div>
        </div>
        <button
          className="menu-toggle-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          style={styles.menuToggleBtn}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <div className="user-block" style={styles.userBlock}>
          <div style={styles.userName}>{admin?.full_name}</div>
          <div style={styles.userRole}>{admin?.role || t('clubOwner')}</div>
        </div>
      </header>

      <div className="app-body" style={styles.body}>
        <nav className={`app-sidebar ${menuOpen ? 'open' : ''}`} style={styles.sidebar}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.future ? '#' : item.to}
              onClick={(e) => {
                if (item.future) {
                  e.preventDefault();
                } else {
                  setMenuOpen(false);
                }
              }}
              className="nav-link-item"
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
                ...(item.future ? styles.navItemFuture : {}),
              })}
            >
              {t(item.key)}
              {item.future && <span style={styles.futureBadge}>{t('soon')}</span>}
            </NavLink>
          ))}

          <button onClick={() => { setMenuOpen(false); logout(); }} style={styles.logoutBtn}>
            {t('signOut')}
          </button>
        </nav>

        <main className="app-main" style={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 28px',
    background: 'var(--felt-800)',
    borderBottom: '1px solid var(--felt-600)',
  },
  brandBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  clubName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.3rem',
    fontWeight: 600,
    color: 'var(--brass-300)',
  },
  userBlock: {
    textAlign: 'right',
  },
  userName: {
    fontWeight: 600,
    fontSize: '0.95rem',
    color: 'var(--chalk-100)',
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'var(--chalk-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  body: {
    display: 'flex',
    flex: 1,
  },
  sidebar: {
    width: 250,
    background: 'var(--felt-900)',
    borderRight: '1px solid var(--felt-600)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 14px',
    gap: 4,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '11px 14px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-200)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'background 0.15s ease',
  },
  navItemActive: {
    background: 'var(--felt-600)',
    color: 'var(--brass-300)',
    fontWeight: 600,
  },
  navItemFuture: {
    color: 'var(--chalk-400)',
    cursor: 'default',
  },
  futureBadge: {
    fontSize: '0.62rem',
    background: 'var(--felt-600)',
    color: 'var(--chalk-400)',
    padding: '2px 6px',
    borderRadius: 999,
    letterSpacing: '0.04em',
  },
  logoutBtn: {
    marginTop: 'auto',
    background: 'transparent',
    border: '1px solid var(--felt-500)',
    color: 'var(--chalk-200)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  menuToggleBtn: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: 'var(--brass-300)',
    fontSize: '1.6rem',
    cursor: 'pointer',
    padding: '4px 8px',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
  },
  main: {
    flex: 1,
    padding: '28px',
    overflowY: 'auto',
    position: 'relative',
  },
};
