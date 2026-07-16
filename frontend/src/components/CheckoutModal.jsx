import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { billingApi } from '../api/endpoints';

/*
  Combines FRD B.4 (Billing & Payments) and B.7 (Final Checkout Process)
  into one guided flow once the owner clicks "Stop" on an active session:
    1. Stop -> shows computed time amount
    2. (Optional) Split billing across selected players
    3. See Details (exact start/end time + food breakdown)
    4. Done -> moves record to Billing Section
    5. Mark Paid, or Unpaid with paid/pending amounts
*/
export default function CheckoutModal({ session, onClose, onCompleted }) {
  const [step, setStep] = useState('review'); // Start directly on review step
  const [selectedPayers, setSelectedPayers] = useState([]);
  const [foodAmount, setFoodAmount] = useState(0);
  const [foodLines, setFoodLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveBill, setLiveBill] = useState({ minutes: 0, timeCharge: 0, total: 0 });
  const [paymentChoice, setPaymentChoice] = useState(null); // 'paid' | 'unpaid'
  const [paidAmount, setPaidAmount] = useState('');
  const [pendingAmount, setPendingAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('offline');
  const [showDetail, setShowDetail] = useState(false);

  const calculateLiveBill = (sess, foodAmt) => {
    const start = new Date(sess.start_time).getTime();
    if (!Number.isFinite(start)) return { minutes: 0, timeCharge: 0, total: foodAmt };

    const nowMs = Date.now();
    const baseElapsed = Math.max(0, nowMs - start);
    const pausedDuration = Number(sess.paused_duration_ms || 0);
    const pAt = sess.paused_at ? new Date(sess.paused_at).getTime() : null;

    let elapsedMs = baseElapsed - pausedDuration;
    if (pAt && pAt > start) {
      const currentPauseLength = Math.max(0, nowMs - pAt);
      elapsedMs = baseElapsed - pausedDuration - currentPauseLength;
    }
    elapsedMs = Math.max(0, elapsedMs);

    const minutes = elapsedMs / 60000;
    const timeCharge = minutes * (sess.hourly_rate / 60);

    const roundedMinutes = Math.round(minutes * 100) / 100;
    const roundedTimeCharge = Math.round(timeCharge * 100) / 100;
    const total = Math.round((roundedTimeCharge + foodAmt) * 100) / 100;

    return {
      minutes: roundedMinutes,
      timeCharge: roundedTimeCharge,
      total,
    };
  };

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await billingApi.detail(session.session_id);
        setFoodAmount(res.data.food_amount || 0);
        setFoodLines(res.data.food_lines || []);
      } catch (err) {
        setError('Could not load bill details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
    setSelectedPayers(session.player_names.map((_, i) => i)); // default: everyone pays
  }, [session.session_id, session.player_names]);

  useEffect(() => {
    if (loading) return;

    const updateBill = () => {
      const bill = calculateLiveBill(session, foodAmount);
      setLiveBill(bill);
    };

    updateBill();
    const interval = setInterval(updateBill, 1000);
    return () => clearInterval(interval);
  }, [loading, session, foodAmount]);

  const togglePayer = (idx) => {
    setSelectedPayers((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleViewDetail = () => {
    setShowDetail(true);
  };

  const handleDone = async () => {
    setBusy(true);
    setError('');
    try {
      // 1. Stop the game session to write the stopped status and final stopTime/amounts to the DB
      await billingApi.stop(session.session_id);

      // 2. Finalize the billing record and split it among selected players
      const payerNames = selectedPayers.map(idx => session.player_names[idx]);
      await billingApi.done(session.session_id, payerNames);

      onCompleted();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not finalize checkout.');
    } finally {
      setBusy(false);
    }
  };

  const handlePaid = async () => {
    setBusy(true);
    try {
      await billingApi.markPaid(session.session_id, checkoutPaymentMethod);
      onCompleted();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not mark as paid.');
    } finally {
      setBusy(false);
    }
  };

  const handleUnpaid = async () => {
    setBusy(true);
    setError('');
    const total = liveBill.total;
    const paid = Number(paidAmount) || 0;
    const pending = Number(pendingAmount) || 0;
    if (Math.round((paid + pending) * 100) !== Math.round(total * 100)) {
      setError(`Paid + Pending must equal the total (₹${total.toFixed(2)}).`);
      setBusy(false);
      return;
    }
    try {
      await billingApi.markUnpaid(session.session_id, paid, pending);
      onCompleted();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not record unpaid balance.');
    } finally {
      setBusy(false);
    }
  };

  const stopResult = {
    minutes_played: liveBill.minutes,
    time_amount: liveBill.timeCharge,
    food_amount: foodAmount,
    total_amount: liveBill.total,
  };

  const splitShare = selectedPayers.length > 0
    ? liveBill.total / selectedPayers.length
    : 0;

  if (loading) {
    return (
      <Modal title={`Checkout — ${session.asset_label}`} onClose={onClose} width={460}>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          {error ? (
            <div style={styles.error}>{error}</div>
          ) : (
            <p style={{ color: 'var(--chalk-200)', fontSize: '0.9rem', marginBottom: 0 }}>
              Calculating live bill...
            </p>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Checkout — ${session.asset_label}`} onClose={onClose} width={460}>
      {step === 'review' && (
        <div>
          <div style={styles.summaryRow}>
            <span>Time played</span>
            <strong>{stopResult.minutes_played} mins</strong>
          </div>
          <div style={styles.summaryRow}>
            <span>Time charge</span>
            <strong>₹{stopResult.time_amount.toFixed(2)}</strong>
          </div>
          <div style={styles.summaryRow}>
            <span>Food &amp; drink</span>
            <strong>₹{stopResult.food_amount.toFixed(2)}</strong>
          </div>
          <div style={{ ...styles.summaryRow, ...styles.totalRow }}>
            <span>Total</span>
            <strong>₹{stopResult.total_amount.toFixed(2)}</strong>
          </div>

          <h4 style={styles.subheading}>Split billing — who's paying?</h4>
          {session.player_names.map((name, idx) => (
            <label key={idx} style={styles.payerRow}>
              <input
                type="checkbox"
                checked={selectedPayers.includes(idx)}
                onChange={() => togglePayer(idx)}
              />
              {name}
              {selectedPayers.includes(idx) && (
                <span style={styles.shareTag}>₹{splitShare.toFixed(2)}</span>
              )}
            </label>
          ))}

          <button type="button" onClick={handleViewDetail} style={styles.detailBtn}>
            See Detail
          </button>

          {showDetail && detail && (
            <div style={styles.detailBox}>
              <p style={styles.detailLine}>
                {new Date(detail.start_time).toLocaleTimeString()} →{' '}
                {new Date(detail.stop_time).toLocaleTimeString()}
              </p>
              {detail.food_lines.length > 0 && (
                <ul style={styles.foodList}>
                  {detail.food_lines.map((line, i) => (
                    <li key={i}>
                      {line.quantity} × {line.name} {line.ordered_by ? `(ordered by ${line.ordered_by})` : ''} — ₹{line.line_total.toFixed(2)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.doneBtn} onClick={handleDone} disabled={busy}>
            {busy ? 'Finalizing…' : 'Done — move to Billing'}
          </button>
        </div>
      )}

      {step === 'payment' && stopResult && (
        <div>
          <p style={styles.text}>
            Total due: <strong>₹{stopResult.total_amount.toFixed(2)}</strong>
          </p>

          {!paymentChoice && (
            <div style={styles.paymentChoiceRow}>
              <button style={styles.paidBtn} onClick={() => setPaymentChoice('paid')}>
                Paid
              </button>
              <button style={styles.unpaidBtn} onClick={() => setPaymentChoice('unpaid')}>
                Unpaid
              </button>
            </div>
          )}

          {paymentChoice === 'paid' && (
            <div>
              <p style={styles.text}>Confirm the customer paid the full amount.</p>
              
              <label style={styles.label}>Payment Method</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    background: checkoutPaymentMethod === 'online' ? 'rgba(79, 70, 229, 0.18)' : 'var(--felt-800)',
                    border: checkoutPaymentMethod === 'online' ? '1px solid #4F46E5' : '1px solid var(--felt-500)',
                    color: checkoutPaymentMethod === 'online' ? '#818CF8' : 'var(--chalk-300)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 0',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => setCheckoutPaymentMethod('online')}
                >
                  📱 Online
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    background: checkoutPaymentMethod === 'offline' ? 'rgba(201, 162, 75, 0.18)' : 'var(--felt-800)',
                    border: checkoutPaymentMethod === 'offline' ? '1px solid var(--brass-500)' : '1px solid var(--felt-500)',
                    color: checkoutPaymentMethod === 'offline' ? 'var(--brass-300)' : 'var(--chalk-300)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '9px 0',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => setCheckoutPaymentMethod('offline')}
                >
                  💵 Offline
                </button>
              </div>

              {error && <div style={styles.error}>{error}</div>}
              <button style={styles.doneBtn} onClick={handlePaid} disabled={busy}>
                {busy ? 'Saving…' : 'Confirm Paid'}
              </button>
            </div>
          )}

          {paymentChoice === 'unpaid' && (
            <div>
              <label style={styles.label}>Paid amount (₹)</label>
              <input
                style={styles.input}
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
              <label style={styles.label}>Pending amount (₹)</label>
              <input
                style={styles.input}
                type="number"
                value={pendingAmount}
                onChange={(e) => setPendingAmount(e.target.value)}
              />
              {error && <div style={styles.error}>{error}</div>}
              <button style={styles.doneBtn} onClick={handleUnpaid} disabled={busy}>
                {busy ? 'Saving…' : 'Save Unpaid Balance'}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

const styles = {
  text: { color: 'var(--chalk-200)', fontSize: '0.9rem', marginBottom: 16 },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.88rem',
    color: 'var(--chalk-200)',
    marginBottom: 8,
  },
  totalRow: {
    borderTop: '1px solid var(--felt-600)',
    paddingTop: 10,
    marginTop: 6,
    fontSize: '1rem',
    color: 'var(--chalk-100)',
  },
  subheading: {
    fontFamily: 'var(--font-display)',
    fontSize: '1rem',
    color: 'var(--brass-300)',
    margin: '20px 0 10px',
  },
  payerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: '0.9rem',
    color: 'var(--chalk-200)',
    marginBottom: 8,
  },
  shareTag: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--brass-300)',
    marginLeft: 'auto',
  },
  detailBtn: {
    background: 'transparent',
    border: '1px solid var(--felt-500)',
    color: 'var(--chalk-200)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 14px',
    fontSize: '0.82rem',
    margin: '10px 0',
  },
  detailBox: {
    background: 'var(--felt-800)',
    borderRadius: 'var(--radius-sm)',
    padding: 12,
    fontSize: '0.85rem',
    color: 'var(--chalk-200)',
    marginBottom: 16,
  },
  detailLine: { margin: '0 0 6px' },
  foodList: { margin: 0, paddingLeft: 18 },
  doneBtn: {
    width: '100%',
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
    fontSize: '0.95rem',
    marginTop: 10,
  },
  stopBtn: {
    width: '100%',
    background: 'var(--rail-600)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
    fontSize: '0.95rem',
  },
  paymentChoiceRow: {
    display: 'flex',
    gap: 10,
  },
  paidBtn: {
    flex: 1,
    background: 'var(--green-go)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
  },
  unpaidBtn: {
    flex: 1,
    background: 'var(--orange-warn)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    color: 'var(--chalk-400)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    marginBottom: 14,
  },
  error: {
    background: 'rgba(139, 38, 53, 0.2)',
    border: '1px solid var(--rail-600)',
    color: 'var(--rail-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontSize: '0.85rem',
    marginBottom: 14,
  },
};
