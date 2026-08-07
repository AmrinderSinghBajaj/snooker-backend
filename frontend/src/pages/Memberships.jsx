import { useState, useEffect } from 'react';
import { membershipsApi, customersApi } from '../api/endpoints';
import Card from '../components/Card';
import Modal from '../components/Modal';

export default function Memberships() {
  const [slabs, setSlabs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState('slabs'); // 'slabs' | 'assign'
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Slabs modal state
  const [slabModalOpen, setSlabModalOpen] = useState(false);
  const [editingSlab, setEditingSlab] = useState(null);
  const [slabName, setSlabName] = useState('');
  const [slabDiscount, setSlabDiscount] = useState('');
  const [slabAppliesTo, setSlabAppliesTo] = useState('table');
  const [slabDescription, setSlabDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [slabsRes, customersRes] = await Promise.all([
        membershipsApi.slabs(),
        customersApi.list(),
      ]);
      setSlabs(slabsRes.data || []);
      setCustomers(customersRes.data || []);
    } catch (err) {
      setError('Could not load membership data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingSlab(null);
    setSlabName('');
    setSlabDiscount('');
    setSlabAppliesTo('table');
    setSlabDescription('');
    setSlabModalOpen(true);
  };

  const handleOpenEditModal = (slab) => {
    setEditingSlab(slab);
    setSlabName(slab.name);
    setSlabDiscount(String(slab.discountPercentage));
    setSlabAppliesTo(slab.appliesTo);
    setSlabDescription(slab.description || '');
    setSlabModalOpen(true);
  };

  const handleSaveSlab = async (e) => {
    e.preventDefault();
    if (!slabName || slabDiscount === '') return;
    const discountNum = Number(slabDiscount);
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      setError('Discount must be between 0% and 100%');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: slabName,
        discountPercentage: discountNum,
        appliesTo: slabAppliesTo,
        description: slabDescription,
      };
      if (editingSlab) {
        await membershipsApi.updateSlab(editingSlab._id || editingSlab.id, payload);
      } else {
        await membershipsApi.createSlab(payload);
      }
      setSlabModalOpen(false);
      setSuccess(editingSlab ? 'Membership slab updated!' : 'Membership slab created!');
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save membership slab.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlab = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete membership slab "${name}"? Customers assigned to it will lose their discount.`)) return;
    try {
      await membershipsApi.deleteSlab(id);
      setSuccess('Slab deleted successfully.');
      loadData();
    } catch (err) {
      setError('Failed to delete membership slab.');
    }
  };

  const handleAssignSlab = async (customerId, slabId) => {
    try {
      await membershipsApi.assign(customerId, slabId || null);
      setSuccess('Customer membership slab updated!');
      // Update local state directly
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, membership_slab_id: slabId || null } : c))
      );
    } catch (err) {
      setError('Failed to assign membership slab.');
    }
  };

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 2500);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (c.display_name || '').toLowerCase().includes(query) ||
      (c.username || '').toLowerCase().includes(query) ||
      (c.phone || '').includes(query)
    );
  });

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>Membership Section</h1>
          <p style={styles.subtitle}>Configure client discount tiers and assign players to them.</p>
        </div>
        {activeTab === 'slabs' && (
          <button style={styles.addBtn} onClick={handleOpenCreateModal}>
            + Add Slab
          </button>
        )}
      </div>

      {success && <div style={styles.successBanner}>{success}</div>}
      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Tabs */}
      <div style={styles.tabNav}>
        <button
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'slabs' ? styles.tabBtnActive : styles.tabBtnInactive),
          }}
          onClick={() => setActiveTab('slabs')}
        >
          Membership Slabs
        </button>
        <button
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'assign' ? styles.tabBtnActive : styles.tabBtnInactive),
          }}
          onClick={() => setActiveTab('assign')}
        >
          Player Assignment
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--chalk-400)' }}>Loading...</p>
      ) : (
        <>
          {activeTab === 'slabs' && (
            <div style={styles.slabsGrid}>
              {slabs.length === 0 ? (
                <Card style={{ padding: 40, textAlign: 'center', gridColumn: '1 / -1' }}>
                  <p style={{ color: 'var(--chalk-400)', margin: 0 }}>No membership slabs created yet. Create a slab to start discounting.</p>
                </Card>
              ) : (
                slabs.map((slab) => (
                  <Card key={slab._id || slab.id} style={styles.slabCard}>
                    <div style={styles.slabCardHeader}>
                      <h3 style={styles.slabTitle}>{slab.name}</h3>
                      <div style={styles.discountBadge}>
                        {slab.discountPercentage}% OFF
                      </div>
                    </div>
                    <div style={styles.slabMeta}>
                      <span>Applies to:</span>
                      <strong style={styles.appliesVal}>
                        {slab.appliesTo === 'both'
                          ? 'Table & Food'
                          : slab.appliesTo === 'food'
                          ? 'Food & Drink Only'
                          : 'Table Time Only'}
                      </strong>
                    </div>
                    {slab.description && <p style={styles.slabDesc}>{slab.description}</p>}
                    
                    <div style={styles.cardActions}>
                      <button style={styles.editBtn} onClick={() => handleOpenEditModal(slab)}>
                        Edit
                      </button>
                      <button style={styles.deleteBtn} onClick={() => handleDeleteSlab(slab._id || slab.id, slab.name)}>
                        Delete
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'assign' && (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 18, borderBottom: '1px solid var(--felt-600)' }}>
                <input
                  type="text"
                  placeholder="Search player by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Player Name</th>
                    <th style={styles.th}>Phone Number</th>
                    <th style={styles.th}>Membership Slab</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ ...styles.td, textAlign: 'center', color: 'var(--chalk-400)' }}>
                        No players found.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} style={styles.tr}>
                        <td style={styles.td}>
                          <span style={{ fontWeight: 600, color: 'var(--chalk-100)' }}>{c.display_name}</span>
                        </td>
                        <td style={styles.tdMono}>{c.phone || '—'}</td>
                        <td style={styles.td}>
                          <select
                            style={styles.select}
                            value={c.membership_slab_id || ''}
                            onChange={(e) => handleAssignSlab(c.id, e.target.value)}
                          >
                            <option value="">No Slab (Standard Billing)</option>
                            {slabs.map((s) => (
                              <option key={s._id || s.id} value={s._id || s.id}>
                                {s.name} ({s.discountPercentage}% OFF - {s.appliesTo})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* Slab Create/Edit Modal */}
      {slabModalOpen && (
        <Modal
          title={editingSlab ? `Edit Membership Slab: ${editingSlab.name}` : 'Create Membership Slab'}
          onClose={() => setSlabModalOpen(false)}
        >
          <form onSubmit={handleSaveSlab} style={styles.form}>
            <label style={styles.label}>Slab Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Bronze Member, VIP Discount"
              value={slabName}
              onChange={(e) => setSlabName(e.target.value)}
              style={styles.input}
            />

            <div style={styles.formRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Discount Percentage (%) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  placeholder="e.g. 10"
                  value={slabDiscount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '' && Number(val) < 0) return;
                    setSlabDiscount(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                  style={styles.input}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>Applies To</label>
                <select
                  value={slabAppliesTo}
                  onChange={(e) => setSlabAppliesTo(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="table">Table Booking Only</option>
                  <option value="food">Food & Drink Only</option>
                  <option value="both">Both Table & Food</option>
                </select>
              </div>
            </div>

            <label style={styles.label}>Description / Details</label>
            <textarea
              placeholder="Slab description details..."
              value={slabDescription}
              onChange={(e) => setSlabDescription(e.target.value)}
              style={{ ...styles.input, height: 60, resize: 'none' }}
            />

            <button type="submit" disabled={submitting} style={styles.saveBtn}>
              {submitting ? 'Saving...' : 'Save Slab'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    color: 'var(--chalk-100)',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--chalk-400)',
    margin: '4px 0 0',
  },
  addBtn: {
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 18px',
    fontWeight: 700,
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  successBanner: {
    background: 'rgba(47, 158, 99, 0.15)',
    border: '1px solid var(--green-go)',
    color: 'var(--green-go)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '0.85rem',
    marginBottom: 16,
  },
  errorBanner: {
    background: 'rgba(139, 38, 53, 0.2)',
    border: '1px solid var(--rail-600)',
    color: 'var(--rail-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: '0.85rem',
    marginBottom: 16,
  },
  tabNav: {
    display: 'flex',
    gap: 2,
    marginBottom: 22,
    borderBottom: '1px solid var(--felt-600)',
  },
  tabBtn: {
    padding: '12px 20px',
    fontSize: '0.9rem',
    fontWeight: 600,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
  tabBtnActive: {
    color: 'var(--brass-300)',
    borderBottom: '2px solid var(--brass-300)',
  },
  tabBtnInactive: {
    color: 'var(--chalk-400)',
    borderBottom: '2px solid transparent',
  },
  slabsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  slabCard: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 180,
  },
  slabCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  slabTitle: {
    margin: 0,
    fontSize: '1.1rem',
    color: 'var(--chalk-100)',
    fontWeight: 700,
  },
  discountBadge: {
    background: 'rgba(201, 162, 75, 0.15)',
    color: 'var(--brass-300)',
    border: '1px solid rgba(201, 162, 75, 0.3)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  slabMeta: {
    fontSize: '0.85rem',
    color: 'var(--chalk-400)',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  appliesVal: {
    color: 'var(--chalk-200)',
  },
  slabDesc: {
    fontSize: '0.82rem',
    color: 'var(--chalk-400)',
    margin: '0 0 16px',
    lineHeight: 1.4,
  },
  cardActions: {
    display: 'flex',
    gap: 8,
    marginTop: 'auto',
    borderTop: '1px solid var(--felt-600)',
    paddingTop: 14,
  },
  editBtn: {
    flex: 1,
    background: 'var(--felt-600)',
    border: '1px solid var(--felt-500)',
    color: 'var(--chalk-100)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 0',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteBtn: {
    flex: 1,
    background: 'rgba(139, 38, 53, 0.1)',
    border: '1px solid rgba(139, 38, 53, 0.25)',
    color: 'var(--rail-300)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 0',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  searchInput: {
    width: '100%',
    maxWidth: 320,
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '8px 12px',
    fontSize: '0.88rem',
    outline: 'none',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 18px',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--chalk-400)',
    borderBottom: '1px solid var(--felt-600)',
    fontWeight: 600,
  },
  tr: {
    borderBottom: '1px solid var(--felt-600)',
  },
  td: {
    padding: '12px 18px',
    fontSize: '0.88rem',
    color: 'var(--chalk-200)',
    verticalAlign: 'middle',
  },
  tdMono: {
    padding: '12px 18px',
    fontSize: '0.85rem',
    color: 'var(--chalk-300)',
    fontFamily: 'var(--font-mono)',
    verticalAlign: 'middle',
  },
  select: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '6px 10px',
    fontSize: '0.88rem',
    outline: 'none',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  formRow: {
    display: 'flex',
    gap: 12,
  },
  label: {
    fontSize: '0.82rem',
    color: 'var(--chalk-400)',
    marginBottom: 4,
  },
  input: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.88rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  selectInput: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.88rem',
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  saveBtn: {
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginTop: 8,
  },
};
