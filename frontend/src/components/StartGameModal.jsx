import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { customersApi } from '../api/endpoints';
import { useTranslation } from '../utils/translations';

// ── iOS Cupertino Style Wheel Column ──────────────────────────────────────
export function IOSWheelColumn({ options, value, onChange, width = '70px' }) {
  const containerRef = useRef(null);
  const currentIndex = options.indexOf(value);
  const isUserScrolling = useRef(false);

  useEffect(() => {
    if (containerRef.current && !isUserScrolling.current) {
      const itemHeight = 40;
      containerRef.current.scrollTop = currentIndex * itemHeight;
    }
  }, [currentIndex]);

  const handleScroll = (e) => {
    isUserScrolling.current = true;
    const itemHeight = 40;
    const scrollPos = e.target.scrollTop;
    const newIndex = Math.round(scrollPos / itemHeight);
    if (newIndex >= 0 && newIndex < options.length) {
      if (options[newIndex] !== value) {
        onChange(options[newIndex]);
      }
    }
    clearTimeout(containerRef.current._scrollTimer);
    containerRef.current._scrollTimer = setTimeout(() => {
      isUserScrolling.current = false;
    }, 120);
  };

  return (
    <div style={{ ...iosStyles.columnWrapper, width }}>
      <div style={iosStyles.viewport} ref={containerRef} onScroll={handleScroll}>
        {/* Top Spacer for Center Alignment */}
        <div style={{ height: 60, flexShrink: 0 }} />

        {options.map((opt) => {
          const isSelected = opt === value;
          return (
            <div
              key={opt}
              style={{
                ...iosStyles.item,
                ...(isSelected ? iosStyles.itemActive : iosStyles.itemInactive),
              }}
              onClick={() => onChange(opt)}
            >
              {opt}
            </div>
          );
        })}

        {/* Bottom Spacer */}
        <div style={{ height: 60, flexShrink: 0 }} />
      </div>
    </div>
  );
}

// ── iOS Cupertino Time Picker Container ────────────────────────────────────
export function IOSPicker({ hour12, minute, ampm, onChangeHour, onChangeMinute, onChangeAmPm }) {
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const periods = ['AM', 'PM'];

  return (
    <div style={iosStyles.pickerContainer}>
      {/* Top & Bottom 3D Fades */}
      <div style={iosStyles.topGradient} />
      <div style={iosStyles.bottomGradient} />

      {/* Center Selection Highlight Bar */}
      <div style={iosStyles.centerSelectionHighlight} />

      {/* 3 Wheel Columns */}
      <div style={iosStyles.columnsRow}>
        <IOSWheelColumn options={hours} value={hour12} onChange={onChangeHour} width="70px" />
        <span style={iosStyles.colon}>:</span>
        <IOSWheelColumn options={minutes} value={minute} onChange={onChangeMinute} width="70px" />
        <IOSWheelColumn options={periods} value={ampm} onChange={onChangeAmPm} width="65px" />
      </div>
    </div>
  );
}

const iosStyles = {
  pickerContainer: {
    position: 'relative',
    height: 160,
    width: '100%',
    maxWidth: '280px',
    background: 'rgba(11, 43, 34, 0.85)',
    border: '1px solid rgba(47, 158, 99, 0.4)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: 'inset 0 4px 20px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0,0,0,0.3)',
    margin: '0 auto',
    userSelect: 'none',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    background: 'linear-gradient(to bottom, rgba(11, 43, 34, 0.95) 0%, transparent 100%)',
    zIndex: 3,
    pointerEvents: 'none',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    background: 'linear-gradient(to top, rgba(11, 43, 34, 0.95) 0%, transparent 100%)',
    zIndex: 3,
    pointerEvents: 'none',
  },
  centerSelectionHighlight: {
    position: 'absolute',
    top: 60,
    left: 8,
    right: 8,
    height: 40,
    background: 'rgba(47, 158, 99, 0.22)',
    borderTop: '1px solid rgba(47, 158, 99, 0.6)',
    borderBottom: '1px solid rgba(47, 158, 99, 0.6)',
    borderRadius: '8px',
    zIndex: 2,
    pointerEvents: 'none',
    boxShadow: '0 0 14px rgba(47, 158, 99, 0.25)',
  },
  columnsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 8,
  },
  columnWrapper: {
    height: '100%',
    position: 'relative',
    zIndex: 4,
  },
  viewport: {
    height: '100%',
    overflowY: 'auto',
    scrollSnapType: 'y mandatory',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  item: {
    height: 40,
    minHeight: 40,
    lineHeight: '40px',
    scrollSnapAlign: 'center',
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.15s ease',
  },
  itemActive: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: '#ffffff',
    transform: 'scale(1.1)',
  },
  itemInactive: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'var(--chalk-400)',
    opacity: 0.35,
  },
  colon: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: 'var(--brass-300)',
    zIndex: 4,
    userSelect: 'none',
  },
};

// ── Main StartGameModal ───────────────────────────────────────────────────────
export default function StartGameModal({ asset, onClose, onStarted, hidePlayers = false }) {
  const { t } = useTranslation();
  const [names, setNames] = useState(['']);
  const [customers, setCustomers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 12-hour clock state
  const [hour12, setHour12] = useState(() => {
    const now = new Date();
    let h12 = now.getHours() % 12;
    if (h12 === 0) h12 = 12;
    return String(h12).padStart(2, '0');
  });

  const [minute, setMinute] = useState(() => {
    return String(new Date().getMinutes()).padStart(2, '0');
  });

  const [ampm, setAmpm] = useState(() => {
    return new Date().getHours() >= 12 ? 'PM' : 'AM';
  });

  useEffect(() => {
    if (!hidePlayers) {
      customersApi.list()
        .then((res) => setCustomers(res.data))
        .catch((err) => console.error('Could not load customers', err));
    }
  }, [hidePlayers]);

  const updateName = (i, value) => {
    const copy = [...names];
    copy[i] = value.slice(0, 25);
    setNames(copy);
  };

  const addNameField = () => {
    if (names.length < 4) setNames([...names, '']);
  };

  const removeNameField = (i) => {
    setNames(names.filter((_, idx) => idx !== i));
  };

  const handlePresetClick = async (minutesAgo) => {
    const target = new Date(Date.now() - minutesAgo * 60 * 1000);
    const cleaned = hidePlayers ? [] : names.map((n) => n.trim()).filter(Boolean);
    if (!hidePlayers && cleaned.length === 0) {
      setError(t('enterAtLeastOnePlayer'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onStarted(cleaned, target.toISOString());
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotStartGame'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleaned = hidePlayers ? [] : names.map((n) => n.trim()).filter(Boolean);
    if (!hidePlayers && cleaned.length === 0) {
      setError(t('enterAtLeastOnePlayer'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let h24 = Number(hour12);
      if (ampm === 'PM' && h24 < 12) h24 += 12;
      if (ampm === 'AM' && h24 === 12) h24 = 0;

      const startDate = new Date();
      startDate.setHours(h24, Number(minute), 0, 0);

      const now = new Date();
      const diffMs = startDate.getTime() - now.getTime();
      if (diffMs > 30 * 60 * 1000) {
        startDate.setDate(startDate.getDate() - 1);
      } else if (diffMs > 0) {
        startDate.setTime(now.getTime());
      }

      await onStarted(cleaned, startDate.toISOString());
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotStartGame'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={hidePlayers ? `Start game in past on ${asset.label}` : `${t('startGameOn')} ${asset.label}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {!hidePlayers && (
          <>
            <label style={styles.label}>{t('playerNames')}</label>
            {names.map((name, i) => (
              <div key={i} style={styles.nameRow}>
                <input
                  style={styles.input}
                  placeholder={`${t('playerPlaceholder')} ${i + 1}`}
                  value={name}
                  onChange={(e) => updateName(i, e.target.value)}
                  maxLength={25}
                  autoFocus={i === 0}
                  list="customer-suggestions"
                />
                {names.length > 1 && (
                  <button type="button" onClick={() => removeNameField(i)} style={styles.removeBtn}>
                    ×
                  </button>
                )}
              </div>
            ))}

            {names.length < 4 && (
              <button type="button" onClick={addNameField} style={styles.addNameBtn}>
                + {t('addAnotherPlayer')}
              </button>
            )}
          </>
        )}

        <div style={styles.clockCard}>
          {/* Quick Presets */}
          <div style={styles.presetGrid}>
            {[
              { label: '3min', mins: 3 },
              { label: '5min', mins: 5 },
              { label: '10min', mins: 10 },
              { label: '15min', mins: 15 },
            ].map((p) => (
              <button
                key={p.mins}
                type="button"
                style={{
                  ...styles.presetBtn,
                  ...(submitting ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                }}
                disabled={submitting}
                onClick={() => handlePresetClick(p.mins)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* iOS Cupertino Style Wheel Picker */}
          <IOSPicker
            hour12={hour12}
            minute={minute}
            ampm={ampm}
            onChangeHour={(h) => setHour12(h)}
            onChangeMinute={(m) => setMinute(m)}
            onChangeAmPm={(period) => setAmpm(period)}
          />
        </div>

        {!hidePlayers && (
          <datalist id="customer-suggestions">
            {customers.map((c) => (
              <option key={c.id} value={c.display_name} />
            ))}
          </datalist>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" style={styles.startBtn} disabled={submitting}>
          {submitting ? t('addingEllipsis') : t('startGame')}
        </button>
      </form>
    </Modal>
  );
}

const styles = {
  label: {
    display: 'block',
    fontSize: '0.8rem',
    color: 'var(--chalk-400)',
    marginBottom: 8,
    fontWeight: 500,
  },
  nameRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.9rem',
  },
  removeBtn: {
    background: 'transparent',
    border: '1px solid var(--felt-500)',
    color: 'var(--chalk-400)',
    borderRadius: 'var(--radius-sm)',
    width: 36,
    fontSize: '1.1rem',
  },
  addNameBtn: {
    background: 'transparent',
    border: '1px dashed var(--felt-500)',
    color: 'var(--brass-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    fontSize: '0.85rem',
    width: '100%',
    marginBottom: 16,
    marginTop: 4,
  },
  clockCard: {
    background: 'rgba(15, 55, 45, 0.45)',
    border: '1px solid rgba(27, 92, 76, 0.5)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 6,
    width: '100%',
    marginBottom: 14,
  },
  presetBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: 'var(--chalk-200)',
    padding: '6px 2px',
    fontSize: '0.76rem',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease',
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
  startBtn: {
    width: '100%',
    background: 'var(--green-go)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
    fontSize: '0.95rem',
  },
};
