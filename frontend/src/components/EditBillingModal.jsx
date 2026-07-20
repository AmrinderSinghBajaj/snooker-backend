import { useState, useEffect } from 'react';
import Modal from './Modal';
import { billingApi, customersApi } from '../api/endpoints';
import { useTranslation } from '../utils/translations';

/*
  Free-form edit of an existing billing row. Built for the real case the
  owner described: the table is stopped under whoever asked, but the actual
  paying player(s) get sorted out after the fact. Every field is editable
  and independent - nothing is recalculated behind the owner's back except
  the derived time-charge split (total minus food), which exists only so
  later detail views stay arithmetically sane.
*/
export default function EditBillingModal({ record, onClose, onSaved }) {
  const { t } = useTranslation();
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

  const getHourlyRate = () => {
    if (record.hourly_rate && record.hourly_rate > 0) {
      return record.hourly_rate;
    }
    const initialTimeAmt = record.time_amount != null
      ? record.time_amount
      : Math.max(0, (record.total_amount || 0) - (record.food_amount || 0));
    const initialMins = (record.start_time && record.stop_time)
      ? (new Date(record.stop_time) - new Date(record.start_time)) / 60000
      : 0;
    if (initialMins > 0 && initialTimeAmt > 0) {
      return (initialTimeAmt / initialMins) * 60;
    }
    return 0;
  };

  const updateAmountsForTimeOrFood = (newStartIsoStr, newStopIsoStr, currentFoodStr, currentPaymentStatus = paymentStatus) => {
    if (!newStartIsoStr || !newStopIsoStr) return;
    const startDt = new Date(newStartIsoStr);
    const stopDt = new Date(newStopIsoStr);
    if (isNaN(startDt.getTime()) || isNaN(stopDt.getTime())) return;

    const mins = Math.max(0, (stopDt - startDt) / 60000);
    const hourlyRate = getHourlyRate();
    const perMinute = hourlyRate / 60;
    const timeCharge = Math.round(mins * perMinute * 100) / 100;
    const foodVal = Number(currentFoodStr) || 0;
    const computedTotal = Math.round((timeCharge + foodVal) * 100) / 100;

    const totalStr = String(computedTotal);
    setTotalAmount(totalStr);

    if (currentPaymentStatus === 'paid') {
      setPaidAmount(totalStr);
      setPendingAmount('0');
    } else {
      const currentPaid = Number(paidAmount) || 0;
      setPendingAmount(String(Math.max(0, Math.round((computedTotal - currentPaid) * 100) / 100)));
    }
  };

  const handleStartTimeChange = (value) => {
    setStartTime(value);
    updateAmountsForTimeOrFood(value, stopTime, foodAmount);
  };

  const handleStopTimeChange = (value) => {
    setStopTime(value);
    updateAmountsForTimeOrFood(startTime, value, foodAmount);
  };

  const handleFoodAmountChange = (value) => {
    setFoodAmount(value);
    updateAmountsForTimeOrFood(startTime, stopTime, value);
  };

  const handleTotalChange = (value) => {
    setTotalAmount(value);
    if (paymentStatus === 'paid') {
      setPaidAmount(value);
      setPendingAmount('0');
    } else {
      const totalNum = Number(value) || 0;
      const paidNum = Number(paidAmount) || 0;
      setPendingAmount(String(Math.max(0, Math.round((totalNum - paidNum) * 100) / 100)));
    }
  };

  const handleSave = async () => {
    setError('');
    const names = playerNamesText.split(',').map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) {
      setError(t('enterAtLeastOnePlayer'));
      return;
    }
    const total = Number(totalAmount);
    const paid = Number(paidAmount);
    const pending = Number(pendingAmount);
    if (Math.round((paid + pending) * 100) !== Math.round(total * 100)) {
      setError(`${t('paidAmountMustEqualTotal')} (₹${total.toFixed(2)}).`);
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
      setError(err.response?.data?.detail || t('couldNotSaveChanges'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`${t('editEntrySerial')}${record.serial_number}`} onClose={onClose} width={480}>
      <div style={styles.form}>
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
              onChange={(e) => handleStartTimeChange(e.target.value)}
            />
          </Field>
          <Field label={t('stopTimeLabel')}>
            <input
              style={styles.input}
              type="datetime-local"
              value={stopTime}
              onChange={(e) => handleStopTimeChange(e.target.value)}
            />
          </Field>
        </div>

        <div style={styles.row2}>
          <Field label={t('foodAmountLabel')}>
            <input
              style={styles.input}
              type="number"
              value={foodAmount}
              onChange={(e) => handleFoodAmountChange(e.target.value)}
            />
          </Field>
          <Field label={t('totalAmountLabel')}>
            <input
              style={styles.input}
              type="number"
              value={totalAmount}
              onChange={(e) => handleTotalChange(e.target.value)}
            />
          </Field>
        </div>

        <Field label={t('paymentStatusLabel')}>
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
              {t('paid')}
            </button>
            <button
              type="button"
              style={{ ...styles.segmentBtn, ...(paymentStatus === 'unpaid' ? styles.segmentActiveUnpaid : {}) }}
              onClick={() => {
                setPaymentStatus('unpaid');
                const totalNum = Number(totalAmount) || 0;
                const paidNum = Number(paidAmount) || 0;
                if (paidNum >= totalNum) {
                  setPaidAmount('0');
                  setPendingAmount(totalAmount);
                } else {
                  setPendingAmount(String(Math.max(0, Math.round((totalNum - paidNum) * 100) / 100)));
                }
              }}
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

        <div style={styles.row2}>
          <Field label={t('paidAmountLabelEdit')}>
            <input
              style={styles.input}
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              disabled={paymentStatus === 'paid'}
            />
          </Field>
          <Field label={t('pendingAmountLabelEdit')}>
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
          {saving ? t('savingEllipsis') : t('saveChanges')}
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
