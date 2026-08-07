import { useState, useEffect, useCallback } from 'react';
import { expensesApi } from '../api/endpoints';
import Card from '../components/Card';
import Modal from '../components/Modal';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total_overall: 0, total_month: 0, total_today: 0, total_count: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Modal Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        expensesApi.list(),
        expensesApi.summary(),
      ]);
      setExpenses(listRes.data || []);
      setSummary(summaryRes.data || { total_overall: 0, total_month: 0, total_today: 0, total_count: 0 });
    } catch (err) {
      console.error('Failed to load expenses data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter an expense name or title.');
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid expense amount greater than ₹0.');
      return;
    }

    setSubmitting(true);
    try {
      await expensesApi.create({
        title: trimmedTitle,
        amount: numAmount,
        note: note.trim(),
        date: new Date().toISOString(),
      });

      // Reset form
      setTitle('');
      setAmount('');
      setNote('');
      setShowAddModal(false);

      // Refresh list & summary
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save expense. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;

    setDeletingId(id);
    try {
      await expensesApi.remove(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not delete expense.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '60vh' }}>
      {/* Header Block */}
      <div style={styles.headerBlock}>
        <div>
          <h1 style={styles.pageTitle}>Club Expenses Management</h1>
        </div>
        <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>
          ➕ Log New Expense
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div style={styles.summaryGrid}>
        <Card style={styles.statCard}>
          <div style={styles.statLabel}>Total Expenses (Overall)</div>
          <div style={styles.statValue}>₹{(summary.total_overall || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </Card>

        <Card style={styles.statCard}>
          <div style={styles.statLabel}>This Month's Expenses</div>
          <div style={styles.statValue}>
            ₹{(summary.total_month || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </Card>

        <Card style={styles.statCard}>
          <div style={styles.statLabel}>Today's Expenses</div>
          <div style={styles.statValue}>
            ₹{(summary.total_today || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </Card>
      </div>

      {/* Expenses Table Card */}
      <Card style={{ padding: 0, overflow: 'hidden', width: '100%' }}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '14%' }}>Date</th>
                <th style={{ ...styles.th, width: '24%' }}>Expense Name / Title</th>
                <th style={{ ...styles.th, width: '16%' }}>Amount (₹)</th>
                <th style={{ ...styles.th, width: '38%' }}>Notes</th>
                <th style={{ ...styles.th, width: '8%', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 48, color: 'var(--chalk-400)' }}>
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 56, color: 'var(--chalk-400)' }}>
                    <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>📋</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--chalk-200)' }}>
                      No expenses found
                    </div>
                    <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                      Click "Log New Expense" above to add your first expense record.
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((item) => {
                  const formattedDate = new Date(item.date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={item.id} style={styles.tr}>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--brass-300)' }}>
                        {formattedDate}
                      </td>
                      <td style={{
                        ...styles.td,
                        fontWeight: 700,
                        color: 'var(--chalk-100)',
                        wordBreak: 'break-word',
                      }}>
                        {item.title}
                      </td>
                      <td style={{ ...styles.td, fontWeight: 700, fontSize: '1rem', color: '#f87171', whiteSpace: 'nowrap' }}>
                        -₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{
                        ...styles.td,
                        color: 'var(--chalk-400)',
                        fontSize: '0.85rem',
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {item.note || '—'}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteExpense(item.id)}
                          disabled={deletingId === item.id}
                          style={styles.deleteBtn}
                          title="Delete Expense Entry"
                        >
                          {deletingId === item.id ? '...' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Expense Modal */}
      {showAddModal && (
        <Modal title="Log New Expense" onClose={() => setShowAddModal(false)} width={460}>
          <form onSubmit={handleCreateExpense}>
            <div style={{ marginBottom: 14 }}>
              <label style={styles.label}>Expense Name / Description * (Max 30 chars)</label>
              <input
                style={styles.input}
                placeholder="e.g. Food purchase, Table service"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 30))}
                maxLength={30}
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={styles.label}>Amount (₹) *</label>
              <input
                style={styles.input}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== '' && Number(val) < 0) return;
                  setAmount(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                }}
                required
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}>Note / Details (Optional - Max 60 chars)</label>
              <textarea
                style={{ ...styles.input, minHeight: 64, resize: 'vertical' }}
                placeholder="Additional details, vendor reference..."
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 60))}
                maxLength={60}
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={styles.cancelBtn}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" style={styles.saveBtn} disabled={submitting}>
                {submitting ? 'Saving...' : '💾 Save Expense'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  headerBlock: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    color: 'var(--chalk-100)',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  addBtn: {
    background: 'linear-gradient(135deg, var(--brass-500) 0%, #a48035 100%)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 20px',
    fontWeight: 700,
    fontSize: '0.92rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(201, 162, 75, 0.25)',
    transition: 'transform 0.15s ease',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 20,
    marginBottom: 24,
  },
  statCard: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  statLabel: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--chalk-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--brass-300)',
    letterSpacing: '-0.02em',
  },
  tableWrap: {
    overflowX: 'auto',
    width: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.88rem',
    tableLayout: 'auto',
  },
  th: {
    padding: '14px 20px',
    textAlign: 'left',
    fontSize: '0.76rem',
    fontWeight: 700,
    color: 'var(--chalk-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid var(--felt-600)',
    background: 'var(--felt-900)',
    boxSizing: 'border-box',
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.12s ease',
  },
  td: {
    padding: '14px 20px',
    verticalAlign: 'middle',
  },
  deleteBtn: {
    background: 'rgba(139, 38, 53, 0.15)',
    border: '1px solid rgba(139, 38, 53, 0.3)',
    color: '#e07080',
    padding: '4px 8px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.85rem',
    transition: 'all 0.15s ease',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    color: 'var(--chalk-400)',
    marginBottom: 6,
    fontWeight: 600,
  },
  input: {
    width: '100%',
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
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
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--felt-500)',
    color: 'var(--chalk-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '9px 18px',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #2F9E63 0%, #1c6d42 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '9px 20px',
    fontSize: '0.88rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
