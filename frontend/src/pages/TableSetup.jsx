import { useState, useEffect } from 'react';
import { assetsApi } from '../api/endpoints';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { getCategoryConfig } from '../utils/categoryAssets';
import { useTranslation } from '../utils/translations';

const CATEGORIES = ['Snooker', 'Pool', 'Heyball', 'PlayStation', 'Chess', 'Carrom'];

/*
  FRD B.2 - Table & PS Section (Setup):
  Owner sets up inventory and pricing. "Add" button opens a box with
  Category Dropdown + Price Field. Once added, shows images labelled
  "Table 1", "Table 2", etc.
*/
export default function TableSetup() {
  const { t, lang } = useTranslation();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState('');

  const loadAssets = () => {
    setLoading(true);
    assetsApi.list()
      .then((res) => setAssets(res.data))
      .catch(() => setError(t('couldNotLoadTables')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!hourlyRate || Number(hourlyRate) <= 0) {
      setError(t('enterRateGreaterThanZero'));
      return;
    }
    setSubmitting(true);
    try {
      await assetsApi.create({ category, hourly_rate: Number(hourlyRate) });
      setShowAddModal(false);
      setHourlyRate('');
      loadAssets();
      setToast(t('tableDeviceAdded'));
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotAddItem'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, label) => {
    const confirmed = window.confirm(`${t('removeConfirmed').replace('?', ` "${label}"?`)}`);
    if (!confirmed) return;
    
    setDeletingId(id);
    try {
      await assetsApi.archive(id);
      loadAssets();
      setToast(`${t('removedLabel')} ${label}`);
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotRemoveItem'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateSortOrder = (id, val) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, sort_order: val } : a))
    );
  };

  const handleSaveSortOrder = async (id, val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    try {
      await assetsApi.update(id, { sort_order: num });
      loadAssets();
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotUpdateOrder'));
    }
  };

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: assets.filter((a) => a.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div style={styles.headerRow}>
        <h1 style={styles.pageTitle}>{t('tablePlaystationSetup')}</h1>
        <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>
          + {t('add')}
        </button>
      </div>

      {loading && <p style={{ color: 'var(--chalk-400)' }}>{t('loading')}</p>}

      {!loading && assets.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--chalk-400)', margin: 0 }}>
            {t('noTablesOrDevices')}
          </p>
        </Card>
      )}

      {grouped.map((group) => {
        const { image, accent, icon } = getCategoryConfig(group.category);
        return (
          <div key={group.category} style={{ marginBottom: 32 }}>
            <h2 style={styles.groupTitle}>
              <span style={{ marginRight: 8 }}>{icon}</span>
              {group.category}
            </h2>
            <div style={styles.grid}>
              {group.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="table-card"
                  style={{ ...styles.assetCard, animationDelay: `${idx * 0.07}s` }}
                >
                  {/* Cover image */}
                  <div className="category-image-wrap" style={styles.assetImageWrap}>
                    {image ? (
                      <img src={image} alt={group.category} style={styles.assetCoverImg} />
                    ) : (
                      <div style={{ ...styles.assetFallback, background: `${accent}22` }}>
                        <span style={{ fontSize: '2rem' }}>{icon}</span>
                      </div>
                    )}
                    <div style={styles.assetGradient} />
                    {/* Status pill over image */}
                    <div style={{
                      ...styles.assetStatusBadge,
                      ...statusBadgeStyle(item.status),
                    }}>
                      {item.status === 'active' ? `● ${t('live').toUpperCase()}`
                        : item.status === 'stopped' ? `◉ ${t('stopped').toUpperCase()}`
                        : `○ ${t('idle').toUpperCase()}`}
                    </div>
                  </div>

                  <div style={styles.assetBody}>
                    <div style={styles.assetLabel}>{item.label}</div>
                    <div style={styles.assetRate}>₹{Number(item.hourly_rate).toFixed(0)} / {lang === 'hi' ? 'घंटा' : lang === 'pb' ? 'ਘੰਟਾ' : 'hr'}</div>
                    <div style={styles.sortOrderRow}>
                      <span style={styles.sortOrderLabel}>{t('serialNo')}:</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        style={styles.sortOrderInput}
                        value={item.sort_order ?? ''}
                        onChange={(e) => handleUpdateSortOrder(item.id, e.target.value)}
                        onBlur={(e) => handleSaveSortOrder(item.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur();
                          }
                        }}
                        placeholder="0"
                        title="Enter serial number to sort this table on the dashboard"
                      />
                    </div>
                  </div>

                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDelete(item.id, item.label)}
                    disabled={deletingId === item.id}
                    title="Remove this table/device"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {showAddModal && (
        <Modal title={t('addTableOrDevice')} onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAdd}>
            <label style={styles.label}>{t('category')}</label>
            <select
              style={styles.input}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label style={styles.label}>{t('hourlyRateRs')}</label>
            <input
              style={styles.input}
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 360"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />

            {hourlyRate > 0 && (
              <p style={styles.rateHint}>
                {lang === 'hi' ? `यह ₹${(Number(hourlyRate) / 60).toFixed(2)} प्रति मिनट है।` : lang === 'pb' ? `ਇਹ ₹${(Number(hourlyRate) / 60).toFixed(2)} ਪ੍ਰਤੀ ਮਿੰਟ ਹੈ।` : `That's ₹${(Number(hourlyRate) / 60).toFixed(2)} per minute.`}
              </p>
            )}

            {error && <div style={styles.error}>{error}</div>}

            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? t('addingEllipsis') : t('addToFloor')}
            </button>
          </form>
        </Modal>
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0-.7 12.1A2 2 0 0 1 14.3 21H9.7a2 2 0 0 1-2-1.9L7 7"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function statusStyle(status) {
  if (status === 'active') return { background: 'rgba(47,158,99,0.2)', color: 'var(--green-go)' };
  if (status === 'stopped') return { background: 'rgba(217,123,43,0.2)', color: 'var(--orange-warn)' };
  return { background: 'rgba(185,175,152,0.15)', color: 'var(--chalk-400)' };
}

function statusBadgeStyle(status) {
  if (status === 'active') return { background: 'rgba(47,158,99,0.85)', color: '#fff' };
  if (status === 'stopped') return { background: 'rgba(217,123,43,0.85)', color: '#fff' };
  return { background: 'rgba(0,0,0,0.55)', color: '#fff' };
}

const styles = {
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    color: 'var(--chalk-100)',
    margin: 0,
  },
  addBtn: {
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 18px',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  groupTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    color: 'var(--brass-300)',
    marginBottom: 12,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 16,
  },
  assetCard: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    position: 'relative',
    textAlign: 'left',
  },
  assetImageWrap: {
    position: 'relative',
    width: '100%',
    height: 130,
    overflow: 'hidden',
  },
  assetCoverImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  assetFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(to top, rgba(15,58,46,0.95) 0%, transparent 100%)',
    pointerEvents: 'none',
  },
  assetStatusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '3px 8px',
    borderRadius: 999,
    backdropFilter: 'blur(4px)',
  },
  assetBody: {
    padding: '12px 14px 14px',
  },
  assetLabel: {
    fontWeight: 600,
    color: 'var(--chalk-100)',
    marginBottom: 4,
  },
  assetRate: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85rem',
    color: 'var(--chalk-400)',
    marginBottom: 10,
  },
  statusPill: {
    display: 'inline-block',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '3px 10px',
    borderRadius: 999,
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    color: 'var(--chalk-400)',
    marginBottom: 6,
    fontWeight: 500,
  },
  input: {
    width: '100%',
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    marginBottom: 16,
  },
  rateHint: {
    fontSize: '0.8rem',
    color: 'var(--chalk-400)',
    marginTop: -10,
    marginBottom: 16,
  },
  error: {
    background: 'rgba(139, 38, 53, 0.2)',
    border: '1px solid var(--rail-600)',
    color: 'var(--rail-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontSize: '0.85rem',
    marginBottom: 16,
  },
  submitBtn: {
    width: '100%',
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
    fontSize: '0.95rem',
  },
  deleteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    background: 'rgba(139, 38, 53, 0.3)',
    border: '1px solid var(--rail-600)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--rail-300)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toast: {
    position: 'fixed',
    bottom: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--felt-700)',
    color: 'var(--chalk-100)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 18px',
    fontSize: '0.9rem',
    fontWeight: 500,
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    zIndex: 1000,
    animation: 'slideUp 0.3s ease',
  },
  sortOrderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTop: '1px solid var(--felt-600)',
    paddingTop: 8,
  },
  sortOrderLabel: {
    fontSize: '0.78rem',
    color: 'var(--chalk-400)',
    fontWeight: 500,
  },
  sortOrderInput: {
    width: 60,
    background: 'var(--felt-900)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--brass-300)',
    padding: '4px 6px',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-mono)',
    textAlign: 'center',
    outline: 'none',
  },
};
