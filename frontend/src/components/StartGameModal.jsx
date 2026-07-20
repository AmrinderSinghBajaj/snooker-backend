import { useState, useEffect } from 'react';
import Modal from './Modal';
import { customersApi } from '../api/endpoints';
import { useTranslation } from '../utils/translations';

export default function StartGameModal({ asset, onClose, onStarted }) {
  const { t } = useTranslation();
  const [names, setNames] = useState(['']);
  const [customers, setCustomers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isCustomTimeTouched, setIsCustomTimeTouched] = useState(false);
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });

  useEffect(() => {
    customersApi.list()
      .then((res) => setCustomers(res.data))
      .catch((err) => console.error('Could not load customers', err));
  }, []);

  const updateName = (i, value) => {
    const copy = [...names];
    copy[i] = value;
    setNames(copy);
  };

  const addNameField = () => {
    if (names.length < 4) setNames([...names, '']);
  };

  const removeNameField = (i) => {
    setNames(names.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleaned = names.map((n) => n.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      setError(t('enterAtLeastOnePlayer'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let startTimeIso = null;

      // Only pass custom past start time if the owner explicitly edited the time input
      if (isCustomTimeTouched && startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);

        const now = new Date();
        const diffMs = startDate.getTime() - now.getTime();
        if (diffMs > 30 * 60 * 1000) {
          // More than 30 minutes in the future -> assume it started yesterday (cross-midnight)
          startDate.setDate(startDate.getDate() - 1);
        } else if (diffMs > 0) {
          // Small future drift -> cap it to current time
          startDate.setTime(now.getTime());
        }
        startTimeIso = startDate.toISOString();
      }

      await onStarted(cleaned, startTimeIso);
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotStartGame'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`${t('startGameOn')} ${asset.label}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={styles.label}>{t('playerNames')}</label>
        {names.map((name, i) => (
          <div key={i} style={styles.nameRow}>
            <input
              style={styles.input}
              placeholder={`${t('playerPlaceholder')} ${i + 1}`}
              value={name}
              onChange={(e) => updateName(i, e.target.value)}
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

        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ ...styles.label, marginBottom: 0 }}>{t('startTimeLabel')}</label>
            <span style={{ fontSize: '0.78rem', color: isCustomTimeTouched ? 'var(--brass-300)' : 'var(--chalk-400)', fontWeight: 600 }}>
              {isCustomTimeTouched ? '⚡ Custom Past Time Active' : '📍 Starts Now (00:00)'}
            </span>
          </div>
          <input
            type="time"
            style={{
              ...styles.timeInput,
              borderColor: isCustomTimeTouched ? 'var(--brass-500)' : 'var(--felt-500)',
            }}
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setIsCustomTimeTouched(true);
            }}
            required
          />
        </div>

        <datalist id="customer-suggestions">
          {customers.map((c) => (
            <option key={c.id} value={c.display_name} />
          ))}
        </datalist>

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
  timeInput: {
    width: '100%',
    colorScheme: 'dark',
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.92rem',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
    boxSizing: 'border-box',
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
