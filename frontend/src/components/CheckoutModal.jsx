import { useState, useEffect } from 'react';
import Modal from './Modal';
import { billingApi, customersApi } from '../api/endpoints';

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
  const [step, setStep] = useState('stop'); // stop -> review -> done
  const [stopResult, setStopResult] = useState(null);
  const [players, setPlayers] = useState([{ name: '', amount: '' }]);
  const [customers, setCustomers] = useState([]);
  const [detail, setDetail] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState(null); // 'paid' | 'unpaid'
  const [paidAmount, setPaidAmount] = useState('');
  const [pendingAmount, setPendingAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('offline');

  useEffect(() => {
    customersApi.list()
      .then((res) => setCustomers(res.data))
      .catch((err) => console.error('Could not load customers', err));
  }, []);

  const autoSplitEqually = (currentPlayers, total) => {
    const M = currentPlayers.length;
    if (M === 0) return currentPlayers;
    const share = Math.round((total / M) * 100) / 100;
    let sum = 0;
    const updated = currentPlayers.map((p, idx) => {
      if (idx === M - 1) {
        const lastAmount = Math.max(0, Math.round((total - sum) * 100) / 100);
        return { ...p, amount: lastAmount.toString() };
      }
      sum += share;
      return { ...p, amount: share.toString() };
    });
    return updated;
  };

  const addPlayerRow = () => {
    if (players.length >= 6) return;
    const newPlayers = [...players, { name: '', amount: '' }];
    setPlayers(autoSplitEqually(newPlayers, stopResult.total_amount));
  };

  const removePlayerRow = (idx) => {
    const newPlayers = players.filter((_, i) => i !== idx);
    setPlayers(autoSplitEqually(newPlayers, stopResult.total_amount));
  };

  const updatePlayerField = (idx, field, value) => {
    const copy = [...players];
    copy[idx][field] = value;
    setPlayers(copy);
  };

  const handleStop = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await billingApi.stop(session.session_id);
      setStopResult(res.data);
      setPlayers([{ name: '', amount: res.data.total_amount.toString() }]);
      setStep('review');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not stop the game.');
    } finally {
      setBusy(false);
    }
  };

  const handleViewDetail = async () => {
    try {
      const res = await billingApi.detail(session.session_id);
      setDetail(res.data);
      setShowDetail(true);
    } catch {
      setError('Could not load details.');
    }
  };

  const handleDone = async () => {
    setBusy(true);
    setError('');
    try {
      const cleanedPlayers = players.map(p => ({
        name: p.name.trim(),
        amount: Number(p.amount) || 0
      }));
      
      if (cleanedPlayers.some(p => p.name === '')) {
        setError('Enter names for all players.');
        setBusy(false);
        return;
      }

      const totalAllocated = cleanedPlayers.reduce((acc, p) => acc + p.amount, 0);
      if (Math.abs(totalAllocated - stopResult.total_amount) > 0.1) {
        setError(`Sum of splits must equal total bill (₹${stopResult.total_amount.toFixed(2)}).`);
        setBusy(false);
        return;
      }

      await billingApi.done(session.session_id, cleanedPlayers);
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
    const total = stopResult.total_amount;
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

  const handleClose = async () => {
    if (step === 'review' && stopResult) {
      setBusy(true);
      try {
        await billingApi.cancelStop(session.session_id);
      } catch (err) {
        console.error('Could not cancel stop:', err);
      } finally {
        setBusy(false);
      }
    }
    onClose();
  };

  const sumOfSplits = players.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const splitDiff = stopResult ? Math.abs(sumOfSplits - stopResult.total_amount) : 0;
  const isSplitValid = stopResult ? (splitDiff < 0.1 && players.every(p => p.name.trim() !== '')) : false;

  return (
    <Modal title={`Checkout — ${session.asset_label}`} onClose={handleClose} width={480}>
      {step === 'stop' && (
        <div>
          <p style={styles.text}>This stops the clock on the table and calculates the bill.</p>
          {error && <div style={styles.error}>{error}</div>}
          <button style={styles.stopBtn} onClick={handleStop} disabled={busy}>
            {busy ? 'Stopping…' : 'Stop game & calculate bill'}
          </button>
        </div>
      )}

      {step === 'review' && stopResult && (
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

          <h4 style={styles.subheading}>Players &amp; Billing Allocation</h4>
          
          <div style={{ maxHeight: '200px', overflowX: 'hidden', overflowY: 'auto', marginBottom: 12, padding: '4px 6px' }}>
            {players.map((player, idx) => (
              <div key={idx} style={styles.playerInputRow}>
                <input
                  style={styles.playerNameInput}
                  placeholder={`Player Name ${idx + 1}`}
                  value={player.name}
                  onChange={(e) => updatePlayerField(idx, 'name', e.target.value)}
                  list="checkout-customer-suggestions"
                  autoFocus={idx === players.length - 1 && idx > 0}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'var(--chalk-400)', fontSize: '0.85rem' }}>₹</span>
                  <input
                    style={styles.playerAmountInput}
                    type="number"
                    placeholder="Amount"
                    value={player.amount}
                    onChange={(e) => updatePlayerField(idx, 'amount', e.target.value)}
                    disabled={players.length === 1}
                  />
                </div>
                {players.length > 1 && (
                  <button type="button" onClick={() => removePlayerRow(idx)} style={styles.removePlayerBtn}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <datalist id="checkout-customer-suggestions">
            {customers.map((c) => (
              <option key={c.id} value={c.display_name} />
            ))}
          </datalist>

          {players.length < 6 && (
            <button type="button" onClick={addPlayerRow} style={styles.addPlayerBtn}>
              + Add Player
            </button>
          )}

          <div style={{
            ...styles.allocationStatus,
            color: isSplitValid ? '#4FA663' : 'var(--orange-warn)',
            borderColor: isSplitValid ? 'rgba(79,166,99,0.3)' : 'rgba(201,162,75,0.3)',
            background: isSplitValid ? 'rgba(79,166,99,0.06)' : 'rgba(201,162,75,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 600 }}>
              <span>Total Allocated:</span>
              <span>₹{sumOfSplits.toFixed(2)} / ₹{stopResult.total_amount.toFixed(2)}</span>
            </div>
            {!isSplitValid && (
              <div style={{ fontSize: '0.78rem', marginTop: 4, fontWeight: 500 }}>
                {players.some(p => p.name.trim() === '') 
                  ? '⚠️ Enter names for all players.' 
                  : `⚠️ Sum of splits must equal total bill. Diff: ₹${(stopResult.total_amount - sumOfSplits).toFixed(2)}`}
              </div>
            )}
          </div>

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

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              type="button"
              style={styles.cancelStopBtn}
              onClick={handleClose}
              disabled={busy}
            >
              ◀ Resume Game
            </button>
            <button 
              style={{ 
                ...styles.doneBtn, 
                marginTop: 0, 
                flex: 1.2,
                opacity: isSplitValid ? 1 : 0.4,
                cursor: isSplitValid ? 'pointer' : 'not-allowed'
              }} 
              onClick={handleDone} 
              disabled={busy || !isSplitValid}
            >
              {busy ? 'Finalizing…' : 'Done — move to Billing'}
            </button>
          </div>
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
    margin: '20px 0 12px',
  },
  playerInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  playerNameInput: {
    flex: 1,
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '8px 12px',
    fontSize: '0.88rem',
    boxSizing: 'border-box',
  },
  playerAmountInput: {
    width: '90px',
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '8px 12px',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-mono)',
    boxSizing: 'border-box',
  },
  removePlayerBtn: {
    background: 'transparent',
    border: '1px solid var(--felt-500)',
    color: 'var(--chalk-400)',
    borderRadius: 'var(--radius-sm)',
    width: 34,
    height: 34,
    fontSize: '1.2rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  addPlayerBtn: {
    background: 'transparent',
    border: '1.5px dashed var(--felt-500)',
    color: 'var(--brass-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    fontSize: '0.85rem',
    width: '100%',
    marginBottom: 12,
    cursor: 'pointer',
    fontWeight: 600,
  },
  allocationStatus: {
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    marginBottom: 12,
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
  cancelStopBtn: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid var(--felt-500)',
    color: 'var(--chalk-200)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
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
