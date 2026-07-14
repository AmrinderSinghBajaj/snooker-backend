import { useState, useEffect } from 'react';
import Modal from './Modal';
import { customersApi } from '../api/endpoints';

export default function StartGameModal({ asset, onClose, onStarted }) {
  const [names, setNames] = useState(['']);
  const [customers, setCustomers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      setError('Enter at least one player name.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onStarted(cleaned);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start the game.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Start game on ${asset.label}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label style={styles.label}>Player names (1-4)</label>
        {names.map((name, i) => (
          <div key={i} style={styles.nameRow}>
            <input
              style={styles.input}
              placeholder={`Player ${i + 1}`}
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
            + Add another player
          </button>
        )}

        <datalist id="customer-suggestions">
          {customers.map((c) => (
            <option key={c.id} value={c.display_name} />
          ))}
        </datalist>

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" style={styles.startBtn} disabled={submitting}>
          {submitting ? 'Starting…' : 'Start'}
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
