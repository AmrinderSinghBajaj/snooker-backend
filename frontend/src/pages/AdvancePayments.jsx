import { useState, useEffect } from 'react';
import { customersApi } from '../api/endpoints';
import { useTranslation } from '../utils/translations';
import Modal from '../components/Modal';

export default function AdvancePayments() {
  const { t } = useTranslation();
  const [data, setData] = useState({ total_advance: 0, customers: [] });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerAdvance, setNewCustomerAdvance] = useState('');
  const [newCustomerMode, setNewCustomerMode] = useState('offline');
  const [newCustomerNote, setNewCustomerNote] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  const [selectedCustomerForAdd, setSelectedCustomerForAdd] = useState(null);
  const [addAmount, setAddAmount] = useState('');
  const [addPaymentMethod, setAddPaymentMethod] = useState('offline');
  const [addNote, setAddNote] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const [selectedCustomerForLogs, setSelectedCustomerForLogs] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await customersApi.walletSummary();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load wallet summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleOpenCreateModal = () => {
    setNewCustomerName('');
    setNewCustomerAdvance('');
    setNewCustomerMode('offline');
    setNewCustomerNote('');
    setCreateError('');
    setShowCreateCustomerModal(true);
  };

  const handleCreateCustomer = async () => {
    setCreateError('');
    if (!newCustomerName.trim()) {
      setCreateError('Please enter a customer name.');
      return;
    }
    setCreateSaving(true);
    try {
      await customersApi.create({
        display_name: newCustomerName.trim(),
        initial_advance: Number(newCustomerAdvance) || 0,
        payment_method: newCustomerMode,
        note: newCustomerNote.trim(),
      });
      setShowCreateCustomerModal(false);
      loadSummary();
    } catch (err) {
      setCreateError(err.response?.data?.detail || t('errorSaving'));
    } finally {
      setCreateSaving(false);
    }
  };

  const handleOpenAddModal = (customer) => {
    setSelectedCustomerForAdd(customer);
    setAddAmount('');
    setAddPaymentMethod('offline');
    setAddNote('');
    setAddError('');
  };

  const handleSaveAddMoney = async () => {
    setAddError('');
    const amt = Number(addAmount);
    if (!amt || amt <= 0) {
      setAddError(t('enterTotalGreaterThanZero'));
      return;
    }
    setAddSaving(true);
    try {
      await customersApi.addWalletMoney(selectedCustomerForAdd.id, amt, addPaymentMethod, addNote);
      setSelectedCustomerForAdd(null);
      loadSummary();
    } catch (err) {
      setAddError(err.response?.data?.detail || t('errorSaving'));
    } finally {
      setAddSaving(false);
    }
  };

  const handleOpenLogsModal = async (customer) => {
    setSelectedCustomerForLogs(customer);
    setLogsLoading(true);
    try {
      const res = await customersApi.walletHistory(customer.id);
      setHistoryLogs(res.data.history || []);
    } catch (err) {
      console.error('Failed to load wallet history', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const filteredCustomers = (data.customers || []).filter((c) =>
    (c.display_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>{t('advancePaymentsTitle')}</h1>
          <p style={styles.subtitle}>{t('advancePaymentsSubtitle')}</p>
        </div>
        <button style={styles.createCustomerBtn} onClick={handleOpenCreateModal}>
          ➕ Add Customer
        </button>
      </header>

      {/* Metric Banner */}
      <div style={styles.metricCard}>
        <div style={styles.metricIcon}>👛</div>
        <div>
          <div style={styles.metricLabel}>{t('totalAdvanceCollected')}</div>
          <div style={styles.metricValue}>₹{(data.total_advance || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={styles.searchRow}>
        <input
          style={styles.searchInput}
          type="text"
          placeholder="Search customer by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Customer Table */}
      <div style={styles.tableWrap}>
        {loading ? (
          <div style={styles.loadingText}>Loading advance payment records...</div>
        ) : filteredCustomers.length === 0 ? (
          <div style={styles.emptyText}>No customer records found.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Customer Name</th>
                <th style={styles.th}>Username</th>
                <th style={styles.th}>Wallet Balance</th>
                <th style={styles.thRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id} style={styles.tr}>
                  <td style={styles.tdBold}>{c.display_name}</td>
                  <td style={styles.tdSub}>@{c.username}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.balanceBadge,
                        ...(c.wallet_balance > 0 ? styles.balancePositive : styles.balanceZero),
                      }}
                    >
                      ₹{(c.wallet_balance || 0).toFixed(2)}
                    </span>
                  </td>
                  <td style={styles.tdRight}>
                    <button style={styles.addBtn} onClick={() => handleOpenAddModal(c)}>
                      ➕ {t('addMoney')}
                    </button>
                    <button style={styles.logsBtn} onClick={() => handleOpenLogsModal(c)}>
                      📜 {t('viewLogs')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Create Customer */}
      {showCreateCustomerModal && (
        <Modal
          title="Create New Customer"
          onClose={() => setShowCreateCustomerModal(false)}
          width={440}
        >
          <div style={styles.modalForm}>
            <label style={styles.fieldLabel}>
              Customer Name *
              <input
                style={styles.modalInput}
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                autoFocus
              />
            </label>

            <label style={styles.fieldLabel}>
              Initial Advance Money (₹) (Optional)
              <input
                style={styles.modalInput}
                type="number"
                placeholder="e.g. 3000 (Leave 0 if none)"
                value={newCustomerAdvance}
                onChange={(e) => setNewCustomerAdvance(e.target.value)}
              />
            </label>

            {Number(newCustomerAdvance) > 0 && (
              <label style={styles.fieldLabel}>
                {t('paymentMode')}
                <div style={styles.segmentRow}>
                  <button
                    type="button"
                    style={{
                      ...styles.segmentBtn,
                      ...(newCustomerMode === 'offline' ? styles.segmentActive : {}),
                    }}
                    onClick={() => setNewCustomerMode('offline')}
                  >
                    💵 Cash / Offline
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.segmentBtn,
                      ...(newCustomerMode === 'online' ? styles.segmentActive : {}),
                    }}
                    onClick={() => setNewCustomerMode('online')}
                  >
                    📱 Online (UPI)
                  </button>
                </div>
              </label>
            )}

            <label style={styles.fieldLabel}>
              {t('noteLabel')}
              <input
                style={styles.modalInput}
                type="text"
                placeholder="e.g. Opening account"
                value={newCustomerNote}
                onChange={(e) => setNewCustomerNote(e.target.value)}
              />
            </label>

            {createError && <div style={styles.errorBox}>{createError}</div>}

            <button style={styles.submitBtn} onClick={handleCreateCustomer} disabled={createSaving}>
              {createSaving ? t('saving') : 'Create Customer'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Add Advance Money */}
      {selectedCustomerForAdd && (
        <Modal
          title={`${t('addAdvanceMoney')} — ${selectedCustomerForAdd.display_name}`}
          onClose={() => setSelectedCustomerForAdd(null)}
          width={440}
        >
          <div style={styles.modalForm}>
            <div style={styles.currentBalanceInfo}>
              <span>Current Wallet Balance:</span>
              <strong>₹{(selectedCustomerForAdd.wallet_balance || 0).toFixed(2)}</strong>
            </div>

            <label style={styles.fieldLabel}>
              {t('enterAmount')}
              <input
                style={styles.modalInput}
                type="number"
                placeholder="e.g. 3000"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                autoFocus
              />
            </label>

            <label style={styles.fieldLabel}>
              {t('paymentMode')}
              <div style={styles.segmentRow}>
                <button
                  type="button"
                  style={{
                    ...styles.segmentBtn,
                    ...(addPaymentMethod === 'offline' ? styles.segmentActive : {}),
                  }}
                  onClick={() => setAddPaymentMethod('offline')}
                >
                  💵 Cash / Offline
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.segmentBtn,
                    ...(addPaymentMethod === 'online' ? styles.segmentActive : {}),
                  }}
                  onClick={() => setAddPaymentMethod('online')}
                >
                  📱 Online (UPI)
                </button>
              </div>
            </label>

            <label style={styles.fieldLabel}>
              {t('noteLabel')}
              <input
                style={styles.modalInput}
                type="text"
                placeholder="e.g. Received ₹3000 cash advance"
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
              />
            </label>

            {addError && <div style={styles.errorBox}>{addError}</div>}

            <button style={styles.submitBtn} onClick={handleSaveAddMoney} disabled={addSaving}>
              {addSaving ? t('saving') : `+ Add ₹${Number(addAmount || 0).toFixed(2)} to Wallet`}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Wallet Transaction Logs / History */}
      {selectedCustomerForLogs && (
        <Modal
          title={`${t('walletHistoryTitle')} — ${selectedCustomerForLogs.display_name}`}
          onClose={() => setSelectedCustomerForLogs(null)}
          width={560}
        >
          <div style={styles.logsContainer}>
            <div style={styles.currentBalanceInfo}>
              <span>Available Wallet Balance:</span>
              <strong style={{ color: 'var(--brass-300)' }}>
                ₹{(selectedCustomerForLogs.wallet_balance || 0).toFixed(2)}
              </strong>
            </div>

            {logsLoading ? (
              <div style={styles.loadingText}>Loading transaction history...</div>
            ) : historyLogs.length === 0 ? (
              <div style={styles.emptyText}>No wallet transactions recorded yet.</div>
            ) : (
              <div style={styles.logsList}>
                {historyLogs.map((log) => {
                  const isCredit = log.type === 'credit';
                  const dt = new Date(log.created_at);
                  const formattedDate = dt.toLocaleString();
                  return (
                    <div key={log.id} style={styles.logCard}>
                      <div style={styles.logHeader}>
                        <span
                          style={{
                            ...styles.logBadge,
                            ...(isCredit ? styles.creditBadge : styles.debitBadge),
                          }}
                        >
                          {isCredit ? '+ Credit (Top-up)' : '- Debit (Bill Payment)'}
                        </span>
                        <span style={styles.logDate}>{formattedDate}</span>
                      </div>
                      <div style={styles.logRowMain}>
                        <div style={styles.logDescription}>{log.description || 'Wallet Transaction'}</div>
                        <div style={isCredit ? styles.creditAmount : styles.debitAmount}>
                          {isCredit ? '+' : '-'}₹{(log.amount || 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={styles.logFooter}>
                        <span>Balance after: ₹{(log.balance_after || 0).toFixed(2)}</span>
                        {log.payment_method && <span style={styles.logMethod}>Mode: {log.payment_method}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
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
  createCustomerBtn: {
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 18px',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
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
  metricCard: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    maxWidth: 380,
  },
  metricIcon: {
    fontSize: '2rem',
    background: 'rgba(201, 162, 75, 0.15)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
  },
  metricLabel: {
    fontSize: '0.8rem',
    color: 'var(--chalk-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  metricValue: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--brass-300)',
    marginTop: 2,
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
  },
  tdRight: {
    padding: '14px 18px',
    textAlign: 'right',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
  balanceBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  balancePositive: {
    background: 'rgba(47,158,99,0.18)',
    color: 'var(--green-go)',
    border: '1px solid rgba(47,158,99,0.4)',
  },
  balanceZero: {
    background: 'var(--felt-700)',
    color: 'var(--chalk-400)',
  },
  addBtn: {
    background: 'rgba(201, 162, 75, 0.15)',
    border: '1px solid var(--brass-500)',
    color: 'var(--brass-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  logsBtn: {
    background: 'var(--felt-700)',
    border: '1px solid var(--felt-500)',
    color: 'var(--chalk-200)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
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

  // Modal styles
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  currentBalanceInfo: {
    background: 'var(--felt-900)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'var(--chalk-200)',
    fontSize: '0.9rem',
    border: '1px solid var(--felt-600)',
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
    background: 'var(--felt-900)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.9rem',
  },
  segmentRow: {
    display: 'flex',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    background: 'var(--felt-900)',
    border: '1px solid var(--felt-500)',
    color: 'var(--chalk-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 0',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  segmentActive: {
    background: 'rgba(201,162,75,0.18)',
    borderColor: 'var(--brass-500)',
    color: 'var(--brass-300)',
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
    fontSize: '0.95rem',
    marginTop: 6,
    cursor: 'pointer',
  },

  // Logs Modal
  logsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  logsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  logCard: {
    background: 'var(--felt-900)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logBadge: {
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  creditBadge: {
    background: 'rgba(47,158,99,0.2)',
    color: 'var(--green-go)',
  },
  debitBadge: {
    background: 'rgba(217,123,43,0.2)',
    color: 'var(--orange-warn)',
  },
  logDate: {
    fontSize: '0.75rem',
    color: 'var(--chalk-400)',
  },
  logRowMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logDescription: {
    fontSize: '0.88rem',
    color: 'var(--chalk-100)',
    fontWeight: 500,
  },
  creditAmount: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--green-go)',
  },
  debitAmount: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--orange-warn)',
  },
  logFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.76rem',
    color: 'var(--chalk-400)',
    borderTop: '1px solid var(--felt-800)',
    paddingTop: 6,
    marginTop: 2,
  },
  logMethod: {
    textTransform: 'capitalize',
  },
};
