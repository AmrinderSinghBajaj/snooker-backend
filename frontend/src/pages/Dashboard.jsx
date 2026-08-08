import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { assetsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { secureSessionStorage } from '../utils/storage';
import Card from '../components/Card';
import LiveTimer from '../components/LiveTimer';
import CheckoutModal from '../components/CheckoutModal';
import EditPlayersModal from '../components/EditPlayersModal';
import StartGameModal from '../components/StartGameModal';
import Table3DModel from '../components/Table3DModel';
import { getCategoryConfig } from '../utils/categoryAssets';
import { useTranslation } from '../utils/translations';

/* Animated background orbs - subtle floating billiard-theme blobs */
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

let cachedAssets = null;
let cachedActiveSessions = null;

export default function Dashboard() {
  const { t, lang } = useTranslation();
  const { admin } = useAuth();
  const [assets, setAssets] = useState(cachedAssets || []);
  const [activeSessions, setActiveSessions] = useState(cachedActiveSessions || []);
  const [loading, setLoading] = useState(!cachedAssets);
  const [startModalAsset, setStartModalAsset] = useState(null);
  const [pastTimeModalAsset, setPastTimeModalAsset] = useState(null);
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [editPlayersSession, setEditPlayersSession] = useState(null);
  const [pendingAssetIds, setPendingAssetIds] = useState(new Set());
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const canEditTables = admin?.role === 'Club Owner' || admin?.role === 'superadmin' || !!admin?.permissions?.tables?.edit;

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [assetsRes, sessionsRes] = await Promise.all([
        assetsApi.list(),
        assetsApi.activeSessions(),
      ]);
      cachedAssets = assetsRes.data;
      cachedActiveSessions = sessionsRes.data;
      setAssets(assetsRes.data);
      setActiveSessions(sessionsRes.data);
    } catch {
      setError(t('couldNotLoadDashboard'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const hasCache = cachedAssets !== null;
    loadAll(hasCache);
  }, [loadAll]);

  const sessionForAsset = (assetId) =>
    activeSessions.find((s) => s.asset_id === assetId);

  // Surgically update a single session in state — avoids full dashboard refresh
  const updateSessionInState = (updatedSession) => {
    setActiveSessions(prev =>
      prev.map(s => s.session_id === updatedSession.session_id ? updatedSession : s)
    );
    cachedActiveSessions = null; // invalidate cache
  };

  const addSessionToState = (newSession) => {
    setActiveSessions(prev => [...prev, newSession]);
    cachedActiveSessions = null;
  };

  const removeSessionFromState = (sessionId) => {
    setActiveSessions(prev => prev.filter(s => s.session_id !== sessionId));
    cachedActiveSessions = null;
  };

  const handleStartInstantly = async (asset) => {
    if (pendingAssetIds.has(asset.id)) return;
    setPendingAssetIds(prev => new Set(prev).add(asset.id));
    try {
      const res = await assetsApi.startGame(asset.id, []);
      if (res.data?.session_id) {
        addSessionToState(res.data);
      } else {
        loadAll(true);
      }
    } catch {
      setError(t('couldNotStartGame') || 'Could not start game.');
    } finally {
      setPendingAssetIds(prev => {
        const copy = new Set(prev);
        copy.delete(asset.id);
        return copy;
      });
    }
  };

  const handleStartPastTimeModal = async (asset, playerNames, startTimeIso) => {
    if (pendingAssetIds.has(asset.id)) return;
    setPendingAssetIds(prev => new Set(prev).add(asset.id));
    try {
      const res = await assetsApi.startGame(asset.id, playerNames, startTimeIso);
      if (res.data?.session_id) {
        addSessionToState(res.data);
      } else {
        loadAll(true);
      }
      setPastTimeModalAsset(null);
    } catch {
      setError(t('couldNotStartGame') || 'Could not start game in the past.');
    } finally {
      setPendingAssetIds(prev => {
        const copy = new Set(prev);
        copy.delete(asset.id);
        return copy;
      });
    }
  };

  const handleCheckoutCompleted = (sessionId) => {
    setCheckoutSession(null);
    if (sessionId) {
      removeSessionFromState(sessionId);
    } else {
      loadAll(true);
    }
  };

  const handlePauseResume = async (assetId, session, isPaused) => {
    if (pendingAssetIds.has(assetId)) return;
    setPendingAssetIds(prev => new Set(prev).add(assetId));
    try {
      const res = isPaused
        ? await assetsApi.resumeGame(assetId)
        : await assetsApi.pauseGame(assetId);
      if (res.data?.session) {
        updateSessionInState(res.data.session);
      } else {
        loadAll(true);
      }
    } catch {
      setError(t('couldNotUpdateStatus'));
    } finally {
      setPendingAssetIds(prev => {
        const copy = new Set(prev);
        copy.delete(assetId);
        return copy;
      });
    }
  };

  const handleCancelGame = async (assetId, sessionId) => {
    if (!window.confirm('Cancel this session? No bill will be created — use only for accidental starts.')) return;
    try {
      await assetsApi.cancelGame(assetId);
      removeSessionFromState(sessionId);
    } catch {
      setError('Could not cancel session.');
    }
  };

  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: '60vh' }}>
        <BackgroundOrbs />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={styles.pageTitle}>{t('consoleControl')}</h1>
          <div style={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!loading && assets.length === 0) {
    return (
      <div style={{ position: 'relative', minHeight: '60vh' }}>
        <BackgroundOrbs />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Card style={{ textAlign: 'center', padding: 64 }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎱</div>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--chalk-100)', marginBottom: 12 }}>
              {t('noTablesOnFloor')}
            </h2>
            <p style={{ color: 'var(--chalk-400)', marginBottom: 28 }}>
              {t('addTablesBeforeStarting')}
            </p>
            <button style={styles.addTablesBtn} onClick={() => navigate('/tables')}>
              {t('addTables')}
            </button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '60vh' }}>
      <BackgroundOrbs />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={styles.headerBlock}>
          <div>
            <h1 style={styles.pageTitle}>{t('dashboardTitle')}</h1>
            <p style={styles.subtitle}>{t('dashboardSubtitle')}</p>
          </div>
          <button
            style={styles.tvBtn}
            onClick={() => {
              const tenantId = secureSessionStorage.getItem('tenant_id');
              const tvUrl = tenantId ? `/tv?club=${tenantId}` : '/tv';
              window.open(tvUrl, '_blank', 'noopener,noreferrer');
            }}
            title="Open read-only view for TV display"
            className="tv-dashboard-btn"
          >
            📺 {t('tvDashboard')}
          </button>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* Operational Grid */}
        <div className="dashboard-grid" style={styles.grid}>
          {assets.map((asset, idx) => {
            const session = sessionForAsset(asset.id);
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
                        <span style={styles.pausedBadge}>{t('paused').toUpperCase()}</span>
                      )}
                    </div>
                  )}

                  {/* Status indicator pill (top-right) */}
                  {(isActive || isPaused) && (
                    <div style={{
                      ...styles.statusBadge,
                      background: isActive
                        ? 'rgba(47,158,99,0.85)'
                        : 'rgba(201,162,75,0.85)',
                      color: isPaused ? 'var(--ink-900)' : '#fff',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      {isActive ? `● ${t('active').toUpperCase()}` : `⏸ ${t('paused').toUpperCase()}`}
                    </div>
                  )}

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
                      ₹{Number(asset.hourly_rate).toFixed(0)}/{lang === 'hi' ? 'घंटा' : lang === 'pb' ? 'ਘੰਟਾ' : 'hr'}
                    </div>
                  </div>

                  {session && (
                    <div style={styles.playerNamesContainer}>
                      <span style={styles.playerNames}>
                        👤 {session.player_names.length > 0 ? session.player_names.join(' · ') : (lang === 'hi' ? 'चालू...' : lang === 'pb' ? 'ਚੱਲ ਰਿਹਾ ਹੈ...' : 'Running...')}
                      </span>
                      {canEditTables && (
                        <button
                          style={styles.resetBtn}
                          onClick={() => handleCancelGame(asset.id, session.session_id)}
                          title="Cancel session — no bill (accidental start only)"
                          aria-label="Cancel session"
                        >
                          <ResetIconMini />
                        </button>
                      )}
                    </div>
                  )}

                  <div style={styles.btnRow}>
                    {!session ? (
                      <div style={{ display: 'flex', width: '100%', gap: 8 }}>
                        <button
                          id={`start-btn-${asset.id}`}
                          style={{
                            ...styles.startBtn,
                            flex: 1,
                            ...(!canEditTables ? styles.disabledBtn : {})
                          }}
                          disabled={!canEditTables}
                          onClick={() => handleStartInstantly(asset)}
                        >
                          ▶ {t('startGame')}
                        </button>
                        <button
                          style={{
                            ...styles.clockBtn,
                            ...(!canEditTables ? styles.disabledBtn : {})
                          }}
                          disabled={!canEditTables}
                          onClick={() => setPastTimeModalAsset(asset)}
                          title="Start time in past"
                          aria-label="Start time in past"
                        >
                          🕒
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          id={`pause-btn-${asset.id}`}
                          style={{
                            ...styles.pauseBtn,
                            ...(!canEditTables ? styles.disabledBtn : {})
                          }}
                          disabled={!canEditTables}
                          onClick={() => handlePauseResume(asset.id, session, isPaused)}
                        >
                          {isPaused ? `▶ ${t('resume')}` : `⏸ ${t('pause')}`}
                        </button>
                        <button
                          id={`stop-btn-${asset.id}`}
                          style={{
                            ...styles.stopBtn,
                            ...(!canEditTables ? styles.disabledBtn : {})
                          }}
                          disabled={!canEditTables}
                          onClick={() => setCheckoutSession(session)}
                        >
                          ■ {t('checkout')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>



      {checkoutSession && (
        <CheckoutModal
          session={checkoutSession}
          onClose={() => setCheckoutSession(null)}
          onCompleted={(sessionId) => handleCheckoutCompleted(sessionId)}
        />
      )}

      {editPlayersSession && (
        <EditPlayersModal
          session={editPlayersSession}
          onClose={() => setEditPlayersSession(null)}
          onUpdated={(updatedSession) => {
            setEditPlayersSession(null);
            if (updatedSession?.session_id) {
              updateSessionInState(updatedSession);
            } else {
              loadAll(true); // fallback
            }
          }}
        />
      )}

      {pastTimeModalAsset && (
        <StartGameModal
          asset={pastTimeModalAsset}
          hidePlayers={true}
          onClose={() => setPastTimeModalAsset(null)}
          onStarted={(playerNames, startTimeIso) =>
            handleStartPastTimeModal(pastTimeModalAsset, playerNames, startTimeIso)
          }
        />
      )}
    </div>
  );
}

const styles = {
  headerBlock: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 16,
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
    marginBottom: 16,
    fontWeight: 500,
  },
  playerFallback: {
    fontSize: '0.85rem',
    color: 'var(--chalk-400)',
    fontStyle: 'italic',
    padding: '8px 0',
    marginBottom: 16,
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    marginTop: 'auto',
  },
  startBtn: {
    flex: 1,
    background: 'linear-gradient(135deg, #2F9E63 0%, #1c6d42 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 0',
    fontWeight: 700,
    fontSize: '0.88rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(47, 158, 99, 0.25)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  clockBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: 'var(--brass-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 16px',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  pauseBtn: {
    flex: 1,
    background: 'linear-gradient(135deg, #C9A24B 0%, #a48035 100%)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 0',
    fontWeight: 700,
    fontSize: '0.88rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(201, 162, 75, 0.2)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  stopBtn: {
    flex: 1,
    background: 'linear-gradient(135deg, #8B2635 0%, #681a25 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 0',
    fontWeight: 700,
    fontSize: '0.88rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(139, 38, 53, 0.25)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  disabledBtn: {
    opacity: 0.4,
    cursor: 'not-allowed',
    boxShadow: 'none',
    transform: 'none',
    pointerEvents: 'none',
  },
  addTablesBtn: {
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 28px',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
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
  playerNamesContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 20,
  },
  resetBtn: {
    background: 'rgba(139, 38, 53, 0.18)',
    border: '1px solid rgba(139, 38, 53, 0.4)',
    color: '#e07080',
    cursor: 'pointer',
    padding: '5px 9px',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  editPlayersBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--chalk-400)',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.15s ease',
  },
  tvBtn: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--brass-300)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 18px',
    fontWeight: 600,
    fontSize: '0.88rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.15s ease',
  },
};

function EditIconMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.7 }}>
      <path d="M16.5 3.5 20 7l-12 12H4v-4l12.5-11.5Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function ResetIconMini() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.9 }}>
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}
