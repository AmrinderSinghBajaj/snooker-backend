import { useState, useEffect, useMemo } from 'react';
import { billingApi } from '../api/endpoints';
import { useTranslation } from '../utils/translations';
import Modal from '../components/Modal';
import Card from '../components/Card';

export default function PendingPayments() {
  const { t, lang } = useTranslation();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');

  // Modals / Selected Details
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  // Payment settlement form state
  const [settleAmount, setSettleAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('offline'); // offline (cash), online, split
  const [walletAmt, setWalletAmt] = useState('');
  const [onlineAmt, setOnlineAmt] = useState('');
  const [offlineAmt, setOfflineAmt] = useState('');
  const [modalError, setModalError] = useState('');

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await billingApi.records();
      setRecords(res.data || []);
    } catch (err) {
      console.error('Failed to load billing records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timeout);
  }, [toast]);

  // Aggregate unpaid records by primary player name
  const outstandingPlayers = useMemo(() => {
    const map = {};
    records
      .filter(r => r.payment_status === 'unpaid')
      .forEach(r => {
        const primaryPlayer = r.player_names?.[0] || 'Unknown';
        if (!map[primaryPlayer]) {
          map[primaryPlayer] = {
            player_name: primaryPlayer,
            total_outstanding: 0,
            record_count: 0,
            latest_date: r.start_time,
            all_records: [],
          };
        }
        map[primaryPlayer].total_outstanding += r.pending_amount || 0;
        map[primaryPlayer].record_count += 1;
        map[primaryPlayer].latest_date = new Date(r.start_time) > new Date(map[primaryPlayer].latest_date)
          ? r.start_time
          : map[primaryPlayer].latest_date;
        map[primaryPlayer].all_records.push(r);
      });

    return Object.values(map)
      .filter(p => p.player_name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.latest_date) - new Date(a.latest_date));
  }, [records, search]);

  const stats = useMemo(() => {
    let totalOutstanding = 0;
    let totalUnpaidBills = 0;
    outstandingPlayers.forEach(p => {
      totalOutstanding += p.total_outstanding;
      totalUnpaidBills += p.record_count;
    });
    return {
      total: totalOutstanding,
      bills: totalUnpaidBills,
      debtors: outstandingPlayers.length,
    };
  }, [outstandingPlayers]);

  const handleOpenDetailModal = (player) => {
    setSelectedPlayer(player);
    setSettleAmount(String(player.total_outstanding));
    setPaymentMethod('offline');
    setWalletAmt('');
    setOnlineAmt('');
    setOfflineAmt('');
    setModalError('');
  };

  const handleSettleOutstanding = async () => {
    setModalError('');
    const amt = Number(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      setModalError('Please enter a valid amount to settle.');
      return;
    }

    let payload = {
      playerName: selectedPlayer.player_name,
      amount_received: amt,
      payment_method: paymentMethod,
    };

    if (paymentMethod === 'split') {
      const w = Number(walletAmt) || 0;
      const o = Number(onlineAmt) || 0;
      const off = Number(offlineAmt) || 0;
      if (Math.round((w + o + off) * 100) !== Math.round(amt * 100)) {
        setModalError(`Split amounts (₹${(w + o + off).toFixed(2)}) must equal total payment (₹${amt.toFixed(2)})`);
        return;
      }
      payload.wallet_amount = w;
      payload.online_amount = o;
      payload.offline_amount = off;
    }

    setBusyId(selectedPlayer.player_name);
    try {
      await billingApi.settleOutstanding(payload);
      setSelectedPlayer(null);
      setToast('Payment recorded and outstanding balances updated!');
      loadRecords();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to record outstanding payment.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>{t('pendingPayments')}</h1>
          <p style={styles.subtitle}>{t('pendingPaymentsSubtitle')}</p>
        </div>
      </header>

      {/* Metric cards */}
      <div style={styles.statsRow}>
        <div style={styles.statPill}>
          <div style={styles.statLabel}>{t('outstanding')}</div>
          <div style={{ ...styles.statValue, color: 'var(--orange-warn)' }}>₹{stats.total.toFixed(2)}</div>
        </div>
        <div style={styles.statPill}>
          <div style={styles.statLabel}>{lang === 'hi' ? 'लंबित बिल' : lang === 'pb' ? 'ਬਕਾਇਆ ਬਿੱਲ' : 'Pending Bills'}</div>
          <div style={{ ...styles.statValue, color: 'var(--chalk-200)' }}>{stats.bills}</div>
        </div>
        <div style={styles.statPill}>
          <div style={styles.statLabel}>{lang === 'hi' ? 'कुल देनदार' : lang === 'pb' ? 'ਕੁੱਲ ਦੇਣਦਾਰ' : 'Debtors'}</div>
          <div style={{ ...styles.statValue, color: 'var(--chalk-200)' }}>{stats.debtors}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={styles.searchRow}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="Search debtor by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Debtors List */}
      <div style={styles.tableWrap}>
        {loading ? (
          <div style={styles.loadingText}>Loading outstanding records...</div>
        ) : outstandingPlayers.length === 0 ? (
          <div style={styles.emptyText}>No pending payment customers found.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Player Name</th>
                <th style={styles.th}>Unpaid Bills Count</th>
                <th style={styles.th}>Latest Unpaid Date</th>
                <th style={styles.thRight}>Total Outstanding</th>
                <th style={styles.thRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {outstandingPlayers.map((p) => (
                <tr key={p.player_name} style={styles.tr}>
                  <td style={styles.tdBold}>{p.player_name}</td>
                  <td style={styles.tdSub}>{p.record_count} {p.record_count === 1 ? 'bill' : 'bills'}</td>
                  <td style={styles.td}>
                    {new Date(p.latest_date).toLocaleDateString()} {new Date(p.latest_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ ...styles.tdRight, color: 'var(--orange-warn)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    ₹{p.total_outstanding.toFixed(2)}
                  </td>
                  <td style={styles.tdRight}>
                    <button style={styles.iconBtn} onClick={() => handleOpenDetailModal(p)} title="View Detail & Settle" aria-label="View Detail & Settle">
                      <EyeIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Outstanding Details & Settlement */}
      {selectedPlayer && (
        <Modal
          title={`${t('outstanding')} — ${selectedPlayer.player_name}`}
          onClose={() => setSelectedPlayer(null)}
          width={520}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* Header info */}
            <div style={styles.currentBalanceInfo}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--chalk-400)' }}>Total Outstanding Balance:</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--orange-warn)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  ₹{selectedPlayer.total_outstanding.toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--chalk-400)' }}>Unpaid Bills:</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--chalk-100)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {selectedPlayer.record_count}
                </div>
              </div>
            </div>

            {/* List of Unpaid Sessions */}
            <div style={styles.unpaidListContainer}>
              <span style={{ fontSize: '0.78rem', color: 'var(--chalk-400)', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                UNPAID TRANSACTION LOGS
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                {selectedPlayer.all_records.map((rec) => {
                  const minutes = rec.time_played_minutes || 0;
                  return (
                    <div key={rec.session_id} style={styles.unpaidCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 4 }}>
                        <span style={{ color: 'var(--chalk-100)' }}>{rec.asset_label || 'Manual Entry'}</span>
                        <span style={{ color: 'var(--orange-warn)', fontFamily: 'var(--font-mono)' }}>₹{rec.pending_amount.toFixed(2)}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--chalk-400)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          {new Date(rec.start_time).toLocaleDateString()} {new Date(rec.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{minutes} min</span>
                      </div>
                      {(rec.food_amount > 0 || rec.time_played_minutes > 0) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: '0.75rem', color: 'var(--chalk-300)' }}>
                          {rec.time_played_minutes > 0 && <span>Game: ₹{(rec.total_amount - rec.food_amount).toFixed(0)}</span>}
                          {rec.food_amount > 0 && <span>Food: ₹{rec.food_amount.toFixed(0)}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Settlement Section */}
            <div style={styles.settleFormBlock}>
              <span style={{ fontSize: '0.78rem', color: 'var(--brass-300)', fontWeight: 700, display: 'block', marginBottom: 12 }}>
                💵 RECORD OUTSTANDING PAYMENT
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={styles.fieldLabel}>
                  Amount Received (₹)
                  <input
                    style={styles.modalInput}
                    type="number"
                    step="0.01"
                    min="0"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="e.g. 200"
                  />
                </label>

                {(() => {
                  const amt = Number(settleAmount) || 0;
                  const diff = Math.round((amt - selectedPlayer.total_outstanding) * 100) / 100;
                  if (amt > 0 && diff > 0) {
                    return (
                      <div style={styles.infoAlert}>
                        🎉 Surplus of ₹{diff.toFixed(2)} will be credited to {selectedPlayer.player_name}'s Advance Wallet!
                      </div>
                    );
                  }
                  if (amt > 0 && diff < 0) {
                    return (
                      <div style={styles.warnAlert}>
                        ⚠️ Partial payment. Remaining ₹{Math.abs(diff).toFixed(2)} will stay in Outstanding.
                      </div>
                    );
                  }
                  return null;
                })()}

                <label style={styles.fieldLabel}>
                  Payment Method
                  <div style={styles.segmentRow}>
                    <button
                      type="button"
                      style={{
                        ...styles.segmentBtn,
                        ...(paymentMethod === 'offline' ? styles.segmentActive : {}),
                      }}
                      onClick={() => setPaymentMethod('offline')}
                    >
                      💵 Cash
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.segmentBtn,
                        ...(paymentMethod === 'online' ? styles.segmentActive : {}),
                      }}
                      onClick={() => setPaymentMethod('online')}
                    >
                      📱 Online (UPI)
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.segmentBtn,
                        ...(paymentMethod === 'split' ? styles.segmentActive : {}),
                      }}
                      onClick={() => setPaymentMethod('split')}
                    >
                      🥞 Split
                    </button>
                  </div>
                </label>

                {paymentMethod === 'split' && (
                  <div style={styles.splitGrid}>
                    <label style={styles.fieldLabel}>
                      Wallet Share (₹)
                      <input
                        style={styles.modalInput}
                        type="number"
                        placeholder="0"
                        value={walletAmt}
                        onChange={(e) => setWalletAmt(e.target.value)}
                      />
                    </label>
                    <label style={styles.fieldLabel}>
                      Online Share (₹)
                      <input
                        style={styles.modalInput}
                        type="number"
                        placeholder="0"
                        value={onlineAmt}
                        onChange={(e) => setOnlineAmt(e.target.value)}
                      />
                    </label>
                    <label style={styles.fieldLabel}>
                      Offline Share (₹)
                      <input
                        style={styles.modalInput}
                        type="number"
                        placeholder="0"
                        value={offlineAmt}
                        onChange={(e) => setOfflineAmt(e.target.value)}
                      />
                    </label>
                  </div>
                )}

                {modalError && <div style={styles.errorBox}>{modalError}</div>}

                <button
                  style={styles.submitBtn}
                  onClick={handleSettleOutstanding}
                  disabled={busyId === selectedPlayer.player_name}
                >
                  {busyId === selectedPlayer.player_name ? 'Saving...' : `Record Payment of ₹${Number(settleAmount || 0).toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--chalk-100)',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.88rem',
    color: 'var(--chalk-400)',
    marginTop: 4,
    margin: 0,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14,
  },
  statPill: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 18px',
  },
  statLabel: {
    fontSize: '0.72rem',
    color: 'var(--chalk-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
    fontWeight: 600,
  },
  statValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.4rem',
    fontWeight: 700,
  },
  searchRow: {
    maxWidth: 400,
  },
  searchInput: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 14px',
    fontSize: '0.9rem',
    width: '100%',
    outline: 'none',
  },
  tableWrap: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '14px 18px',
    background: 'var(--felt-900)',
    color: 'var(--chalk-300)',
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
    borderBottom: '1px solid var(--felt-600)',
  },
  thRight: {
    textAlign: 'right',
    padding: '14px 18px',
    background: 'var(--felt-900)',
    color: 'var(--chalk-300)',
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
    borderBottom: '1px solid var(--felt-600)',
  },
  tr: {
    borderBottom: '1px solid var(--felt-700)',
    transition: 'background 0.15s ease',
  },
  tdBold: {
    padding: '14px 18px',
    color: 'var(--chalk-100)',
    fontWeight: 600,
    fontSize: '0.92rem',
  },
  tdSub: {
    padding: '14px 18px',
    color: 'var(--chalk-400)',
    fontSize: '0.85rem',
  },
  td: {
    padding: '14px 18px',
    fontSize: '0.9rem',
    color: 'var(--chalk-200)',
  },
  tdRight: {
    padding: '14px 18px',
    textAlign: 'right',
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--chalk-300)',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 'var(--radius-sm)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.1s ease',
  },
  loadingText: {
    padding: 30,
    textAlign: 'center',
    color: 'var(--chalk-400)',
    fontSize: '0.9rem',
  },
  emptyText: {
    padding: 30,
    textAlign: 'center',
    color: 'var(--chalk-400)',
    fontSize: '0.9rem',
  },
  currentBalanceInfo: {
    background: 'var(--felt-900)',
    padding: '14px 16px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'var(--chalk-200)',
    fontSize: '0.9rem',
    border: '1px solid var(--felt-600)',
  },
  unpaidListContainer: {
    background: 'var(--felt-950)',
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--felt-700)',
  },
  unpaidCard: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    textAlign: 'left',
  },
  settleFormBlock: {
    background: 'var(--felt-900)',
    padding: '16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--felt-600)',
    textAlign: 'left',
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: '0.82rem',
    color: 'var(--chalk-300)',
    fontWeight: 500,
  },
  modalInput: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.95rem',
    outline: 'none',
  },
  infoAlert: {
    background: 'rgba(201, 162, 75, 0.15)',
    border: '1px solid var(--brass-500)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    fontSize: '0.8rem',
    color: 'var(--brass-300)',
    fontWeight: 600,
  },
  warnAlert: {
    background: 'rgba(217, 123, 43, 0.15)',
    border: '1px solid var(--orange-warn)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    fontSize: '0.8rem',
    color: 'var(--orange-warn)',
    fontWeight: 600,
  },
  segmentRow: {
    display: 'flex',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    color: 'var(--chalk-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '9px 0',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  segmentActive: {
    background: 'rgba(201,162,75,0.18)',
    borderColor: 'var(--brass-500)',
    color: 'var(--brass-300)',
  },
  splitGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    marginTop: 4,
  },
  errorBox: {
    background: 'rgba(139, 38, 53, 0.2)',
    border: '1px solid var(--rail-600)',
    color: 'var(--rail-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontSize: '0.85rem',
  },
  submitBtn: {
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
    fontSize: '0.92rem',
    marginTop: 6,
    cursor: 'pointer',
    width: '100%',
  },
  toast: {
    position: 'fixed',
    bottom: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--ink-900)',
    color: 'var(--chalk-100)',
    border: '1px solid var(--brass-500)',
    borderRadius: 999,
    padding: '10px 22px',
    fontSize: '0.85rem',
    fontWeight: 600,
    boxShadow: 'var(--shadow-raised)',
    animation: 'modalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 200,
  },
};
