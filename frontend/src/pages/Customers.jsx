import { useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { customersApi } from '../api/endpoints';
import { useTranslation } from '../utils/translations';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0);

const relativeTime = (date) => {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

// ── Rank Badge ────────────────────────────────────────────────────────────────
function RankBadge({ rank }) {
  if (rank === 1) return <span style={rankStyles.gold}>🥇 #1</span>;
  if (rank === 2) return <span style={rankStyles.silver}>🥈 #2</span>;
  if (rank === 3) return <span style={rankStyles.bronze}>🥉 #3</span>;
  return <span style={rankStyles.default}>#{rank}</span>;
}
const rankStyles = {
  gold:    { fontSize: '0.72rem', fontWeight: 700, background: 'rgba(212,175,55,0.18)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 8, padding: '2px 8px' },
  silver:  { fontSize: '0.72rem', fontWeight: 700, background: 'rgba(180,180,195,0.18)', color: '#c0c0d0', border: '1px solid rgba(180,180,195,0.3)', borderRadius: 8, padding: '2px 8px' },
  bronze:  { fontSize: '0.72rem', fontWeight: 700, background: 'rgba(180,100,50,0.18)', color: '#cd7f32', border: '1px solid rgba(180,100,50,0.3)', borderRadius: 8, padding: '2px 8px' },
  default: { fontSize: '0.72rem', fontWeight: 600, color: 'var(--chalk-400)', padding: '2px 4px' },
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ ...cardStyles.stat, borderColor: `${accent}30` }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--chalk-400)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.85rem', fontWeight: 700, color: accent ?? 'var(--chalk-100)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--chalk-400)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Customers() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [sort, setSort]           = useState('revenue'); // 'revenue' | 'sessions' | 'recent' | 'name'
  const [view, setView]           = useState('grid');    // 'grid' | 'table'
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setPage(1);
  }, [search, sort]);

  useEffect(() => {
    api.get('/customers/stats')
      .then((r) => setCustomers(r.data))
      .catch(() => {
        setError('Could not load customer data.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteCustomer = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete player "${name}"? This will permanently remove them from the Player Book.`)) {
      return;
    }
    try {
      await customersApi.remove(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
      setError('Could not delete customer.');
    }
  };

  // ── Derived stats ───────────────────────────────────────────────────────────
  const totalRevenue   = useMemo(() => customers.reduce((s, c) => s + (c.total_spent ?? 0), 0), [customers]);
  const totalSessions  = useMemo(() => customers.reduce((s, c) => s + (c.sessions_played ?? 0), 0), [customers]);

  // ── Filtering & Sorting ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...customers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.display_name.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q));
    }
    switch (sort) {
      case 'sessions': list.sort((a, b) => (b.sessions_played ?? 0) - (a.sessions_played ?? 0)); break;
      case 'recent':   list.sort((a, b) => new Date(b.last_visit ?? 0) - new Date(a.last_visit ?? 0)); break;
      case 'name':     list.sort((a, b) => a.display_name.localeCompare(b.display_name)); break;
      default:         list.sort((a, b) => (b.total_spent ?? 0) - (a.total_spent ?? 0)); break;
    }
    return list;
  }, [customers, search, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentEntries = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.page}>
        <h1 style={styles.pageTitle}>Player Book</h1>
        <div style={styles.statsRow}>
          {[1,2,3].map((n) => <div key={n} className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-md)' }} />)}
        </div>
        <div style={gridStyles}>
          {[1,2,3,4,5,6].map((n) => <div key={n} className="skeleton" style={{ height: 130, borderRadius: 'var(--radius-md)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Player Book</h1>
          <p style={styles.subtitle}>Lifetime spend & activity for every player at the club</p>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* ── Summary Stats ── */}
      <div style={styles.statsRow}>
        <StatCard label="Total Players"   value={customers.length}       sub="on record"          accent="var(--chalk-100)" />
        <StatCard label="Total Revenue"   value={fmt(totalRevenue)}      sub="lifetime across all" accent="var(--brass-300)" />
        <StatCard label="Total Sessions"  value={totalSessions}          sub="games played"        accent="#4ade80" />
      </div>

      {customers.length === 0 && !error ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎱</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--chalk-200)', marginBottom: 8 }}>No players yet</div>
          <p style={{ color: 'var(--chalk-400)', margin: 0, maxWidth: 340 }}>
            Players are logged automatically the first time a game is started with their name.
          </p>
        </div>
      ) : (
        <>
          {/* ── Toolbar ── */}
          <div style={styles.toolbar}>
            <div style={styles.searchWrap}>
              <span style={styles.searchIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                id="customer-search"
                placeholder="Search players…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
              {search && (
                <button onClick={() => setSearch('')} style={styles.clearBtn}>✕</button>
              )}
            </div>

            <div style={styles.viewToggle}>
              <button
                onClick={() => setView('grid')}
                title="Grid view"
                style={{ ...styles.viewBtn, ...(view === 'grid' ? styles.viewBtnActive : {}) }}
              >
                ⊞
              </button>
              <button
                onClick={() => setView('table')}
                title="Table view"
                style={{ ...styles.viewBtn, ...(view === 'table' ? styles.viewBtnActive : {}) }}
              >
                ☰
              </button>
            </div>
          </div>

          {/* ── Result count ── */}
          {search && (
            <p style={{ color: 'var(--chalk-400)', fontSize: '0.85rem', marginBottom: 16 }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
            </p>
          )}

          {/* ── Grid View ── */}
          {view === 'grid' && (
            <div style={gridStyles}>
              {currentEntries.map((c, idx) => {
                const rank = customers.indexOf(c) + 1; // rank is in revenue-sorted list
                const isTop = rank <= 3 && sort === 'revenue' && !search;
                return (
                  <div
                    key={c.id}
                    className="customer-card"
                    style={{
                      ...cardStyles.card,
                      ...(isTop ? cardStyles.topCard : {}),
                      animationDelay: `${idx * 0.04}s`,
                    }}
                  >
                    <div style={cardStyles.topRow}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={cardStyles.name}>{c.display_name}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RankBadge rank={rank} />
                        <button
                          style={styles.cardDeleteBtn}
                          onClick={() => handleDeleteCustomer(c.id, c.display_name)}
                          title="Delete player"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    <div style={cardStyles.revenueBlock}>
                      <div style={cardStyles.revenueLabel}>Lifetime Spend</div>
                      <div style={cardStyles.revenueValue}>{fmt(c.total_spent)}</div>
                    </div>

                    <div style={cardStyles.metaRow}>
                      <div style={cardStyles.metaItem}>
                        <div style={cardStyles.metaKey}>Sessions</div>
                        <div style={cardStyles.metaVal}>{c.sessions_played ?? 0}</div>
                      </div>
                      <div style={cardStyles.metaItem}>
                        <div style={cardStyles.metaKey}>Last visit</div>
                        <div style={cardStyles.metaVal}>{relativeTime(c.last_visit)}</div>
                      </div>
                      <div style={cardStyles.metaItem}>
                        <div style={cardStyles.metaKey}>Joined</div>
                        <div style={cardStyles.metaVal}>{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Table View ── */}
          {view === 'table' && (
            <div style={tableStyles.wrap}>
              <table style={tableStyles.table}>
                <thead>
                  <tr>
                    <th style={tableStyles.th}>#</th>
                    <th style={tableStyles.th}>Player</th>
                    <th style={tableStyles.th}>Lifetime Spend</th>
                    <th style={tableStyles.th}>Sessions</th>
                    <th style={tableStyles.th}>Last Visit</th>
                    <th style={tableStyles.th}>Joined</th>
                    <th style={{ ...tableStyles.th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEntries.map((c, idx) => {
                    const rank = customers.indexOf(c) + 1;
                    return (
                      <tr key={c.id} className="customer-row" style={tableStyles.tr}>
                        <td style={tableStyles.td}><RankBadge rank={rank} /></td>
                        <td style={tableStyles.td}>
                          <div style={{ fontWeight: 600, color: 'var(--chalk-100)' }}>{c.display_name}</div>
                        </td>
                        <td style={tableStyles.td}>
                          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--brass-300)', fontWeight: 700 }}>{fmt(c.total_spent)}</div>
                        </td>
                        <td style={tableStyles.td}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--chalk-100)' }}>{c.sessions_played ?? 0}</span>
                        </td>
                        <td style={tableStyles.td}>{relativeTime(c.last_visit)}</td>
                        <td style={tableStyles.td}>{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td style={{ ...tableStyles.td, textAlign: 'right' }}>
                          <button
                            style={styles.deleteBtn}
                            onClick={() => handleDeleteCustomer(c.id, c.display_name)}
                            title="Delete player"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ ...styles.pageBtn, ...(page === 1 ? styles.pageBtnDisabled : {}) }}
              >
                ← {t('previous')}
              </button>
              <span style={styles.pageInfo}>
                {t('page')} {page} {t('of')} {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ ...styles.pageBtn, ...(page === totalPages ? styles.pageBtnDisabled : {}) }}
              >
                {t('next')} →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = {
  page: { position: 'relative', paddingBottom: 48 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 },
  pageTitle: { fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--chalk-100)', margin: 0, letterSpacing: '-0.01em' },
  subtitle: { color: 'var(--chalk-400)', margin: '4px 0 0', fontSize: '0.92rem' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 },
  toolbar: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  searchWrap: { position: 'relative', flex: 1, minWidth: 200, maxWidth: 340 },
  searchIcon: { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--chalk-400)', display: 'flex', alignItems: 'center' },
  searchInput: {
    width: '100%',
    background: 'rgba(20,70,58,0.5)',
    border: '1px solid rgba(27,92,76,0.6)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '9px 36px 9px 36px',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    backdropFilter: 'blur(6px)',
  },
  clearBtn: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--chalk-400)', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 4px' },

  viewToggle: { display: 'flex', gap: 3, background: 'rgba(15,58,46,0.6)', border: '1px solid rgba(27,92,76,0.4)', borderRadius: 'var(--radius-sm)', padding: 3 },
  viewBtn: { background: 'none', border: 'none', color: 'var(--chalk-400)', width: 34, height: 30, borderRadius: 5, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  viewBtnActive: { background: 'rgba(201,162,75,0.18)', color: 'var(--brass-300)' },
  emptyState: { textAlign: 'center', padding: '80px 0', color: 'var(--chalk-400)' },
  errorBanner: { background: 'rgba(139,38,53,0.2)', border: '1px solid var(--rail-600)', color: 'var(--rail-300)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.85rem', marginBottom: 20 },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 28 },
  pageBtn: { background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-sm)', color: 'var(--chalk-200)', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', outline: 'none' },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  pageInfo: { fontSize: '0.88rem', color: 'var(--chalk-400)', fontWeight: 500 },
  deleteBtn: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 'var(--radius-sm)',
    color: '#f87171',
    width: 32,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    padding: 0,
    outline: 'none',
  },
  cardDeleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--chalk-400)',
    width: 28,
    height: 28,
    borderRadius: 'var(--radius-sm)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    padding: 0,
    outline: 'none',
  },
};

const gridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 20,
};

const cardStyles = {
  card: {
    position: 'relative',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
    animation: 'cardEntrance 0.35s ease both',
    overflow: 'hidden',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  topCard: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  topRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  name: { fontWeight: 700, fontSize: '1.15rem', color: 'var(--chalk-100)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  revenueBlock: { display: 'flex', flexDirection: 'column', gap: 4 },
  revenueLabel: { fontSize: '0.68rem', fontWeight: 600, color: 'var(--chalk-400)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  revenueValue: { fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--brass-300)' },
  metaRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 12, marginTop: 4 },
  metaItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  metaKey: { fontSize: '0.65rem', color: 'var(--chalk-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 },
  metaVal: { fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--chalk-100)', whiteSpace: 'nowrap' },
  stat: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 22px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  },
};

const tableStyles = {
  wrap: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    backdropFilter: 'blur(12px)',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '13px 18px',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--chalk-400)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    fontWeight: 600,
  },
  tr: { borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.15s' },
  td: { padding: '14px 18px', fontSize: '0.9rem', color: 'var(--chalk-200)', verticalAlign: 'middle' },
};

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0-.7 12.1A2 2 0 0 1 14.3 21H9.7a2 2 0 0 1-2-1.9L7 7"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
