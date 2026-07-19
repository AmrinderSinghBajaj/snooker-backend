import { useState, useEffect } from 'react';
import Modal from './Modal';
import { billingApi, customersApi } from '../api/endpoints';
import { useTranslation } from '../utils/translations';

/*
  For play that never went through the normal Start/Stop flow - a missed
  entry from a previous shift, a phone booking settled in cash, etc.
  Mirrors a real session's shape so it reads identically in the table once saved.
*/
export default function ManualEntryModal({ onClose, onSaved }) {
  const { t } = useTranslation();
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 30 * 60000); // 30 min ago, sensible default

  const toLocalInput = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [assetLabel, setAssetLabel] = useState('');
  const [playerNamesText, setPlayerNamesText] = useState('');
  const [startTime, setStartTime] = useState(toLocalInput(defaultStart));
  const [stopTime, setStopTime] = useState(toLocalInput(now));
  const [foodAmount, setFoodAmount] = useState('0');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paidAmount, setPaidAmount] = useState('0');
  const [pendingAmount, setPendingAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('offline');
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
    } else {
      setPendingAmount(value);
      setPaidAmount('0');
    }
  };

  const handlePaymentChoice = (status) => {
    setPaymentStatus(status);
    if (status === 'paid') {
      setPaidAmount(totalAmount || '0');
      setPendingAmount('0');
    } else {
      setPaidAmount('0');
      setPendingAmount(totalAmount || '0');
    }
  };

  const handleSave = async () => {
    setError('');
    const names = playerNamesText.split(',').map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) {
      setError(t('enterAtLeastOnePlayer'));
      return;
    }
    if (!assetLabel.trim()) {
      setError(t('enterTableLabel'));
      return;
    }
    if (new Date(stopTime) <= new Date(startTime)) {
      setError(t('endTimeMustBeAfterStart'));
      return;
    }
    const total = Number(totalAmount);
    if (!total || total <= 0) {
      setError(t('enterTotalGreaterThanZero'));
      return;
    }
    const paid = Number(paidAmount);
    const pending = Number(pendingAmount);
    if (Math.round((paid + pending) * 100) !== Math.round(total * 100)) {
      setError(`${t('paidAmountMustEqualTotal')} (₹${total.toFixed(2)}).`);
      return;
    }

    setSaving(true);
    try {
      await billingApi.createManualEntry({
        asset_label: assetLabel.trim(),
        player_names: names,
        start_time: new Date(startTime).toISOString(),
        stop_time: new Date(stopTime).toISOString(),
        food_amount: Number(foodAmount) || 0,
        total_amount: total,
        payment_status: paymentStatus,
        paid_amount: paid,
        pending_amount: pending,
        payment_method: paymentStatus === 'paid' ? paymentMethod : null,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={t('addManualEntryTitle')} onClose={onClose} width={480}>
      <div style={styles.form}>
        <p style={styles.hint}>
          {t('addManual')}
        </p>

        <Field label={t('tableOrLabel')}>
          <input
            style={styles.input}
            value={assetLabel}
            onChange={(e) => setAssetLabel(e.target.value)}
            placeholder={t('tableOrLabelPlaceholder')}
          />
        </Field>

        <Field label={t('playerNamesLabel')}>
          <input
            style={styles.input}
            value={playerNamesText}
            onChange={(e) => setPlayerNamesText(e.target.value)}
            placeholder={t('playerNamesPlaceholder')}
            list="customer-suggestions"
          />
        </Field>

        <div style={styles.row2}>
          <Field label={t('startTimeLabel')}>
            <input
              style={styles.input}
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
          <Field label={t('stopTimeLabel')}>
            <input
              style={styles.input}
              type="datetime-local"
              value={stopTime}
              onChange={(e) => setStopTime(e.target.value)}
            />
          </Field>
        </div>

        <div style={styles.row2}>
          <Field label={t('foodAmountLabel')}>
            <input
              style={styles.input}
              type="number"
              value={foodAmount}
              onChange={(e) => setFoodAmount(e.target.value)}
            />
          </Field>
          <Field label={t('totalAmountLabel')}>
            <input
              style={styles.input}
              type="number"
              value={totalAmount}
              onChange={(e) => handleTotalChange(e.target.value)}
              placeholder="e.g. 240"
            />
          </Field>
        </div>

        <Field label={t('paymentStatusLabel')}>
          <div style={styles.segmentRow}>
            <button
              type="button"
              style={{ ...styles.segmentBtn, ...(paymentStatus === 'paid' ? styles.segmentActivePaid : {}) }}
              onClick={() => handlePaymentChoice('paid')}
            >
              {t('paid')}
            </button>
            <button
              type="button"
              style={{ ...styles.segmentBtn, ...(paymentStatus === 'unpaid' ? styles.segmentActiveUnpaid : {}) }}
              onClick={() => handlePaymentChoice('unpaid')}
            >
              {t('unpaid')}
            </button>
          </div>
        </Field>

        {paymentStatus === 'paid' && (
          <Field label={t('paymentMethodLabel')}>
            <div style={styles.segmentRow}>
              <button
                type="button"
                style={{ ...styles.segmentBtn, ...(paymentMethod === 'online' ? styles.segmentActivePaid : {}) }}
                onClick={() => setPaymentMethod('online')}
              >
                📱 {t('online')}
              </button>
              <button
                type="button"
                style={{ ...styles.segmentBtn, ...(paymentMethod === 'offline' ? styles.segmentActivePaid : {}) }}
                onClick={() => setPaymentMethod('offline')}
              >
                💵 {t('offline')}
              </button>
            </div>
          </Field>
        )}

        {paymentStatus === 'unpaid' && (
          <div style={styles.row2}>
            <Field label={t('paidAmountLabelEdit')}>
              <input
                style={styles.input}
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </Field>
            <Field label={t('pendingAmountLabelEdit')}>
              <input
                style={styles.input}
                type="number"
                value={pendingAmount}
                onChange={(e) => setPendingAmount(e.target.value)}
              />
            </Field>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <datalist id="customer-suggestions">
          {customers.map((c) => (
            <option key={c.id} value={c.display_name} />
          ))}
        </datalist>

        <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? t('savingEllipsis') : t('addToBilling')}
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
  hint: {
    fontSize: '0.84rem',
    color: 'var(--chalk-400)',
    margin: '0 0 4px',
    lineHeight: 1.5,
  },
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
  },
};
