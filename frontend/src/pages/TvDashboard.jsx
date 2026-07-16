import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useBranding } from '../context/BrandingContext';
import LiveTimer from '../components/LiveTimer';
import Table3DModel from '../components/Table3DModel';
import { getCategoryConfig } from '../utils/categoryAssets';
import Logo from '../components/Logo';

function BackgroundOrbs() {
  return (
    <div className="bg-orbs" aria-hidden="true">
      <div className="orb" style={{
        width: 420, height: 420,
        top: '5%', left: '-8%',
        background: 'radial-gradient(circle, #1B5C4C 0%, transparent 70%)',
        animation: 'floatOrb 18s ease-in-out infinite',
        opacity: 0.14,
      }} />
      <div className="orb" style={{
        width: 320, height: 320,
        top: '55%', right: '-4%',
        background: 'radial-gradient(circle, #14463A 0%, transparent 70%)',
        animation: 'floatOrb2 22s ease-in-out infinite',
        opacity: 0.12,
      }} />
      <div className="orb" style={{
        width: 260, height: 260,
        bottom: '8%', left: '35%',
        background: 'radial-gradient(circle, #97772F 0%, transparent 70%)',
        animation: 'floatOrb 28s ease-in-out infinite reverse',
        opacity: 0.08,
      }} />
      <div className="orb" style={{
        width: 180, height: 180,
        top: '30%', left: '60%',
        background: 'radial-gradient(circle, #246E5A 0%, transparent 70%)',
        animation: 'floatOrb2 16s ease-in-out infinite 4s',
        opacity: 0.10,
      }} />
    </div>
  );
}

export default function TvDashboard() {
  const branding = useBranding();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const tenantId = sessionStorage.getItem('tenant_id');
      const urlParams = new URLSearchParams(window.location.search);
      const clubQuery = urlParams.get('club') || tenantId;

      const res = await api.get('/assets/public-active-sessions', {
        params: clubQuery ? { club: clubQuery } : {},
      });
      setData(res.data);
      setError('');
    } catch (err) {
      console.error('TvDashboard load error:', err);
      setError('Connection interrupted. Reconnecting...');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 10 seconds
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div style={styles.tvWrapper}>
        <BackgroundOrbs />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={styles.pageTitle}>{branding.club_name}</h1>
          <div style={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.tvWrapper}>
      <BackgroundOrbs />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={styles.headerBlock}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Logo size={40} />
            <div>
              <h1 style={styles.pageTitle}>{branding.club_name}</h1>
              <p style={styles.subtitle}>Live Arena Board • Real-time table tracking</p>
            </div>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* Operational Grid */}
        <div style={styles.grid}>
          {data.map((item, idx) => {
            const asset = {
              id: item.asset_id,
              label: item.label,
              category: item.category,
              hourly_rate: item.hourly_rate,
              status: item.status,
            };
            const session = item.session;
            const { accent } = getCategoryConfig(asset.category);
            const isActive = !!session && session.status === 'running';
            const isPaused = !!session && session.status === 'paused';

            return (
              <div
                key={asset.id}
                className={`table-card${isActive ? ' active' : isPaused ? ' paused' : ''}`}
                style={{
                  ...styles.tableCard,
                  animationDelay: `${idx * 0.05}s`,
                }}
              >
                {/* 3D Model Viewport Area */}
                <div className="category-image-wrap" style={styles.imageWrap}>
                  
                  {/* Procedural 3D model */}
                  <Table3DModel
                    category={asset.category}
                    isActive={isActive}
                    isPaused={isPaused}
                  />

                  {/* Glassmorphic Gradient overlay */}
                  <div style={styles.imageGradient} />

                  {/* Active/Paused digital timer overlay */}
                  {session && (
                    <div className="timer-overlay" style={styles.timerOverlay}>
                      <LiveTimer
                        elapsedMs={session.elapsed_ms}
                        paused={session.status === 'paused'}
                        startTime={session.start_time}
                        pausedAt={session.paused_at}
                        pausedDurationMs={session.paused_duration_ms}
                      />
                      {isPaused && (
                        <span style={styles.pausedBadge}>PAUSED</span>
                      )}
                    </div>
                  )}

                  {/* Status indicator pill (top-right) */}
                  <div style={{
                    ...styles.statusBadge,
                    background: isActive
                      ? 'rgba(47,158,99,0.85)'
                      : isPaused
                      ? 'rgba(201,162,75,0.85)'
                      : 'rgba(11, 43, 34, 0.65)',
                    color: isPaused ? 'var(--ink-900)' : '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    {isActive ? '● LIVE' : isPaused ? '⏸ PAUSED' : '○ IDLE'}
                  </div>

                  {/* Category label badge (bottom-left) */}
                  <div style={{
                    ...styles.categoryBadge,
                    background: `${accent}22`,
                    border: `1.5px solid ${accent}66`,
                  }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: accent, letterSpacing: '0.1em' }}>
                      {asset.category.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Operations & Control body */}
                <div style={styles.cardBody}>
                  <div style={styles.tableInfoRow}>
                    <div style={styles.tableLabel}>{asset.label}</div>
                    <div style={styles.tableMeta}>
                      ₹{Number(asset.hourly_rate).toFixed(0)}/hr
                    </div>
                  </div>

                  {session ? (
                    <div style={styles.playerNamesContainer}>
                      <span style={styles.playerNames}>
                        👤 {session.player_names.join(' · ')}
                      </span>
                    </div>
                  ) : (
                    <div style={styles.playerFallback}>No active session</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  tvWrapper: {
    minHeight: '100vh',
    background: 'var(--felt-900)',
    color: 'var(--chalk-100)',
    padding: '28px',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-body)',
    position: 'relative',
    overflowY: 'auto',
  },
  headerBlock: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    color: 'var(--chalk-100)',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  subtitle: {
    color: 'var(--chalk-400)',
    margin: '4px 0 0',
    fontSize: '0.95rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 24,
  },
  tableCard: {
    background: 'rgba(20, 70, 58, 0.3)',
    border: '1px solid rgba(27, 92, 76, 0.4)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    height: 180,
    background: 'rgba(11, 43, 34, 0.4)',
    overflow: 'hidden',
    borderBottom: '1px solid rgba(27, 92, 76, 0.3)',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    background: 'linear-gradient(to top, rgba(11, 43, 34, 0.8) 0%, transparent 100%)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  timerOverlay: {
    zIndex: 3,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: '0.62rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '5px 10px',
    borderRadius: '12px',
    backdropFilter: 'blur(6px)',
    zIndex: 4,
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    padding: '4px 8px',
    borderRadius: '6px',
    backdropFilter: 'blur(6px)',
    zIndex: 4,
  },
  pausedBadge: {
    marginTop: 6,
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: 'var(--brass-300)',
    background: 'rgba(0,0,0,0.6)',
    padding: '3px 10px',
    borderRadius: 999,
    border: '1px solid rgba(201,162,75,0.3)',
  },
  cardBody: {
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  tableInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  tableLabel: {
    fontWeight: 700,
    color: 'var(--chalk-100)',
    fontSize: '1.15rem',
  },
  tableMeta: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    color: 'var(--brass-300)',
  },
  playerNames: {
    fontSize: '0.88rem',
    color: 'var(--chalk-200)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    fontWeight: 500,
  },
  playerNamesContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 20,
    marginBottom: 16,
  },
  playerFallback: {
    fontSize: '0.85rem',
    color: 'var(--chalk-400)',
    fontStyle: 'italic',
    padding: '8px 0',
    marginBottom: 16,
  },
  errorBanner: {
    background: 'rgba(139, 38, 53, 0.2)',
    border: '1px solid var(--rail-600)',
    color: 'var(--rail-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '0.85rem',
    marginBottom: 16,
  },
};
