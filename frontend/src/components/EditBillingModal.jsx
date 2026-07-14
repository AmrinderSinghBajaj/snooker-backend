import { useState, useEffect } from 'react';
import Modal from './Modal';
import { billingApi, customersApi } from '../api/endpoints';

/*
  Free-form edit of an existing billing row. Built for the real case the
  owner described: the table is stopped under whoever asked, but the actual
  paying player(s) get sorted out after the fact. Every field is editable
  and independent - nothing is recalculated behind the owner's back except
  the derived time-charge split (total minus food), which exists only so
  later detail views stay arithmetically sane.
*/
export default function EditBillingModal({ record, onClose, onSaved }) {
  const toLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [playerNamesText, setPlayerNamesText] = useState(record.player_names.join(', '));
  const [startTime, setStartTime] = useState(toLocalInput(record.start_time));
  const [stopTime, setStopTime] = useState(toLocalInput(record.stop_time));
  const [foodAmount, setFoodAmount] = useState(String(record.food_amount));
  const [totalAmount, setTotalAmount] = useState(String(record.total_amount));
  const [paymentStatus, setPaymentStatus] = useState(record.payment_status || 'unpaid');
  const [paidAmount, setPaidAmount] = useState(String(record.paid_amount));
  const [pendingAmount, setPendingAmount] = useState(String(record.pending_amount));
  const [paymentMethod, setPaymentMethod] = useState(record.payment_method || 'offline');
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    customersApi.list()
      .then((res) => setCustomers(res.data))
      .catch((err) => console.error('Could not load customers', err));
  }, []);

  const handleTotalChange = (value) => {
    setTotalAmount(value);
    if (paymentStatus === 'paid') {
      setPaidAmount(value);
      setPendingAmount('0');
    }
  };

  const handleSave = async () => {
    setError('');
    const names = playerNamesText.split(',').map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) {
      setError('Enter at least one player name.');
      return;
    }
    const total = Number(totalAmount);
    const paid = Number(paidAmount);
    const pending = Number(pendingAmount);
    if (Math.round((paid + pending) * 100) !== Math.round(total * 100)) {
      setError(`Paid + Pending must equal the total (₹${total.toFixed(2)}).`);
      return;
    }

    setSaving(true);
    try {
      await billingApi.edit(record.session_id, {
        player_names: names,
        start_time: new Date(startTime).toISOString(),
        stop_time: new Date(stopTime).toISOString(),
        food_amount: Number(foodAmount),
        total_amount: total,
        payment_status: paymentStatus,
        paid_amount: paid,
        pending_amount: pending,
        payment_method: paymentStatus === 'paid' ? paymentMethod : null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save these changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Edit entry — #${record.serial_number}`} onClose={onClose} width={480}>
      <div style={styles.form}>
        <Field label="Player name(s)">
          <input
            style={styles.input}
            value={playerNamesText}
            onChange={(e) => setPlayerNamesText(e.target.value)}
            placeholder="Comma-separated, e.g. Raj, Aman"
            list="customer-suggestions"
          />
        </Field>

        <div style={styles.row2}>
          <Field label="Start time">
            <input
              style={styles.input}
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
          <Field label="End time">
            <input
              style={styles.input}
              type="datetime-local"
              value={stopTime}
              onChange={(e) => setStopTime(e.target.value)}
            />
          </Field>
        </div>

        <div style={styles.row2}>
          <Field label="Food & drink (₹)">
            <input
              style={styles.input}
              type="number"
              value={foodAmount}
              onChange={(e) => setFoodAmount(e.target.value)}
            />
          </Field>
          <Field label="Total amount (₹)">
            <input
              style={styles.input}
              type="number"
              value={totalAmount}
              onChange={(e) => handleTotalChange(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Payment status">
          <div style={styles.segmentRow}>
            <button
              type="button"
              style={{ ...styles.segmentBtn, ...(paymentStatus === 'paid' ? styles.segmentActivePaid : {}) }}
              onClick={() => {
                setPaymentStatus('paid');
                setPaidAmount(totalAmount);
                setPendingAmount('0');
              }}
            >
              Paid
            </button>
            <button
              type="button"
              style={{ ...styles.segmentBtn, ...(paymentStatus === 'unpaid' ? styles.segmentActiveUnpaid : {}) }}
              onClick={() => setPaymentStatus('unpaid')}
            >
              Unpaid
            </button>
          </div>
        </Field>

        {paymentStatus === 'paid' && (
          <Field label="Payment method">
            <div style={styles.segmentRow}>
              <button
                type="button"
                style={{ ...styles.segmentBtn, ...(paymentMethod === 'online' ? styles.segmentActivePaid : {}) }}
                onClick={() => setPaymentMethod('online')}
              >
                📱 Online
              </button>
              <button
                type="button"
                style={{ ...styles.segmentBtn, ...(paymentMethod === 'offline' ? styles.segmentActivePaid : {}) }}
                onClick={() => setPaymentMethod('offline')}
              >
                💵 Offline
              </button>
            </div>
          </Field>
        )}

        <div style={styles.row2}>
          <Field label="Paid amount (₹)">
            <input
              style={styles.input}
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              disabled={paymentStatus === 'paid'}
            />
          </Field>
          <Field label="Pending amount (₹)">
            <input
              style={styles.input}
              type="number"
              value={pendingAmount}
              onChange={(e) => setPendingAmount(e.target.value)}
              disabled={paymentStatus === 'paid'}
            />
          </Field>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <datalist id="customer-suggestions">
          {customers.map((c) => (
            <option key={c.id} value={c.display_name} />
          ))}
        </datalist>

        <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.fieldWrap}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

const styles = {
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  label: {
    fontSize: '0.76rem',
    color: 'var(--chalk-400)',
    fontWeight: 500,
    letterSpacing: '0.01em',
  },
  input: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-body)',
    width: '100%',
  },
  segmentRow: { display: 'flex', gap: 8 },
  segmentBtn: {
    flex: 1,
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    color: 'var(--chalk-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '9px 0',
    fontWeight: 600,
    fontSize: '0.85rem',
    transition: 'all 0.15s ease',
  },
  segmentActivePaid: {
    background: 'rgba(47,158,99,0.18)',
    borderColor: 'var(--green-go)',
    color: 'var(--green-go)',
  },
  segmentActiveUnpaid: {
    background: 'rgba(217,123,43,0.18)',
    borderColor: 'var(--orange-warn)',
    color: 'var(--orange-warn)',
  },
  error: {
    background: 'rgba(139, 38, 53, 0.2)',
    border: '1px solid var(--rail-600)',
    color: 'var(--rail-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontSize: '0.85rem',
  },
  saveBtn: {
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '13px 0',
    fontWeight: 700,
    fontSize: '0.95rem',
    marginTop: 4,
    transition: 'transform 0.12s ease, opacity 0.15s ease',
  },
};
