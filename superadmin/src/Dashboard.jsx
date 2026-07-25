import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from './api';

const HeaderCrownSVG = () => (
  <svg 
    width="28" 
    height="28" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(0 2px 4px rgba(201, 162, 75, 0.4))' }}
  >
    <path 
      d="M2 5L6 11L12 6L18 11L22 5L18 17H6L2 5Z" 
      fill="url(#headerGoldGradient)" 
      stroke="var(--brass-300)" 
      strokeWidth="1.2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient id="headerGoldGradient" x1="2" y1="5" x2="22" y2="17" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#c9a24b" />
        <stop offset="50%" stopColor="#e3c878" />
        <stop offset="100%" stopColor="#9a762b" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Dashboard() {
  const { admin, logout } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClub, setEditingClub] = useState(null);

  // Add Club Form state
  const [addForm, setAddForm] = useState({
    name: '',
    subdomain: '',
    ownerName: '',
    username: '',
    password: '',
    validityDays: '30',
  });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addLogoFile, setAddLogoFile] = useState(null);

  // Edit Club Form state
  const [editForm, setEditForm] = useState({
    _id: '',
    name: '',
    ownerName: '',
    username: '',
    password: '',
    expiryDateStr: '', // 'YYYY-MM-DD'
    isActive: true,
  });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/superadmin/clubs');
      setClubs(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch clubs list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Toggle club active status directly from list
  const handleToggleStatus = async (clubId, currentStatus) => {
    try {
      await api.put(`/superadmin/clubs/${clubId}`, { isActive: !currentStatus });
      setClubs(prev => prev.map(c => c._id === clubId ? { ...c, isActive: !currentStatus } : c));
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);
    try {
      // Auto-generate the subdomain slug from the club name
      const slug = addForm.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      const payload = { ...addForm, subdomain: slug };
      const res = await api.post('/superadmin/clubs', payload);
      const newClubId = res.data.club._id;

      // If a logo file was selected, upload it immediately
      if (addLogoFile) {
        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              await api.post(`/superadmin/clubs/${newClubId}/logo`, { logoBase64: reader.result });
              resolve();
            } catch (logoErr) {
              reject(logoErr);
            }
          };
          reader.onerror = () => reject(new Error('Failed to read logo file.'));
          reader.readAsDataURL(addLogoFile);
        });
      }

      setShowAddModal(false);
      setAddForm({
        name: '',
        subdomain: '',
        ownerName: '',
        username: '',
        password: '',
        validityDays: '30',
      });
      setAddLogoFile(null);
      fetchClubs();
    } catch (err) {
      setAddError(err.response?.data?.detail || err.message || 'Onboarding failed.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    try {
      const payload = {
        name: editForm.name,
        ownerName: editForm.ownerName,
        username: editForm.username,
        isActive: editForm.isActive,
        expiryDate: editForm.expiryDateStr ? new Date(editForm.expiryDateStr) : null,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      
      await api.put(`/superadmin/clubs/${editForm._id}`, payload);
      
      // Handle logo upload if present
      if (logoFile) {
        setLogoUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            await api.post(`/superadmin/clubs/${editForm._id}/logo`, { logoBase64: reader.result });
            fetchClubs();
          } catch (logoErr) {
            alert('Club updated, but logo upload failed.');
          } finally {
            setLogoUploading(false);
            setLogoFile(null);
            setShowEditModal(false);
          }
        };
        reader.readAsDataURL(logoFile);
      } else {
        setShowEditModal(false);
        fetchClubs();
      }
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Update failed.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClub = async () => {
    if (!editingClub) return;
    
    const confirmed = window.confirm(
      `⚠️ WARNING: PERMANENT DELETION\n\n` +
      `Are you absolutely sure you want to delete the club "${editingClub.name}"?\n\n` +
      `This action CANNOT be undone and will permanently delete:\n` +
      `  • The club account and credentials\n` +
      `  • All registered tables and devices\n` +
      `  • All customer database records\n` +
      `  • All billing sessions and revenue histories\n` +
      `  • The uploaded club logo\n\n` +
      `Type OK to confirm deletion.`
    );
    
    if (!confirmed) return;
    
    setEditError('');
    setEditLoading(true);
    try {
      await api.delete(`/superadmin/clubs/${editingClub._id}`);
      setShowEditModal(false);
      fetchClubs();
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to delete club.');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = (club) => {
    setEditingClub(club);
    setEditForm({
      _id: club._id,
      name: club.name,
      ownerName: club.ownerName,
      username: club.ownerUsername,
      password: '', // blank by default (only sets if typed)
      expiryDateStr: club.expiryDate ? new Date(club.expiryDate).toISOString().split('T')[0] : '',
      isActive: club.isActive,
    });
    setLogoFile(null);
    setEditError('');
    setShowEditModal(true);
  };

  const handleLogoChange = (file, isEdit = false) => {
    if (!file) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('Logo file size exceeds the 10MB limit. Please choose a smaller file.');
      return;
    }
    if (isEdit) {
      setLogoFile(file);
    } else {
      setAddLogoFile(file);
    }
  };

  // Helper calculations
  const calculateDaysLeft = (club) => {
    if (!club.expiryDate) {
      if (club.trialDurationDays) {
        return `${club.trialDurationDays} days (Pending first login)`;
      }
      return 'Unlimited / No Expiry';
    }
    const diffTime = new Date(club.expiryDate) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    return `${diffDays} days left`;
  };

  const todayDateStr = new Date().toISOString().split('T')[0];
  const totalClubs = clubs.length;
  const activeClubs = clubs.filter(c => c.isActive && (!c.expiryDate || new Date(c.expiryDate) > new Date())).length;
  const inactiveClubs = totalClubs - activeClubs;

  const filteredClubs = clubs.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.ownerName.toLowerCase().includes(search.toLowerCase()) ||
    c.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredClubs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentClubs = filteredClubs.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div style={styles.container}>
      {/* Navigation Header */}
      <header style={styles.header}>
        <div style={styles.logoGroup}>
          <HeaderCrownSVG />
          <h1 style={styles.headerTitle}>Super Admin Panel</h1>
        </div>
        <div style={styles.headerControls}>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      <main style={styles.main}>
        {/* Statistics Cards */}
        <section style={styles.statsSection}>
          <div style={styles.statsCard}>
            <span style={styles.statsLabel}>Total Onboarded Clubs</span>
            <span style={styles.statsValue}>{totalClubs}</span>
          </div>
          <div style={{ ...styles.statsCard, borderLeftColor: 'var(--green-go)' }}>
            <span style={styles.statsLabel}>Active Subscriptions</span>
            <span style={styles.statsValue}>{activeClubs}</span>
          </div>
          <div style={{ ...styles.statsCard, borderLeftColor: 'var(--rail-600)' }}>
            <span style={styles.statsLabel}>Expired or Disabled</span>
            <span style={styles.statsValue}>{inactiveClubs}</span>
          </div>
        </section>

        {/* Search & Actions Bar */}
        <section style={styles.filterBar}>
          <input
            style={styles.searchInput}
            placeholder="Search clubs, owner names, or subdomain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={() => setShowAddModal(true)} style={styles.addClubBtn}>
            + Onboard New Club
          </button>
        </section>

        {/* Clubs List Table */}
        <section style={styles.tableCard}>
          {error && <div style={styles.errorBanner}>{error}</div>}
          {loading ? (
            <div style={styles.loadingBanner}>Loading operational data...</div>
          ) : filteredClubs.length === 0 ? (
            <div style={styles.loadingBanner}>No clubs match your query.</div>
          ) : (
            <>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: 60 }}>#</th>
                      <th style={styles.th}>Logo</th>
                      <th style={styles.th}>Club Name</th>
                      <th style={styles.th}>Owner Name</th>
                      <th style={styles.th}>Username</th>
                      <th style={styles.th}>Password</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Validity Period</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentClubs.map((club, index) => {
                      const daysLeftText = calculateDaysLeft(club);
                      const isExpired = daysLeftText === 'Expired';
                      const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                        <tr key={club._id} style={styles.tr}>
                          <td style={{ ...styles.td, color: 'var(--chalk-400)', fontWeight: 600 }}>{serialNumber}</td>
                          <td style={styles.td}>
                            {club.logoUrl ? (
                              <img src={`${api.defaults.baseURL}${club.logoUrl}`} alt="logo" style={styles.logoImg} />
                            ) : (
                              <div style={styles.logoPlaceholder}>
                                {club.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td style={styles.td}>
                            <div style={styles.clubNameCell}>{club.name}</div>
                          </td>
                          <td style={styles.td}>{club.ownerName}</td>
                          <td style={styles.td} className="code-font">{club.ownerUsername}</td>
                          <td style={styles.td} className="code-font">{club.ownerPassword}</td>
                          <td style={styles.td}>
                            <button
                              onClick={() => handleToggleStatus(club._id, club.isActive)}
                              style={{
                                ...styles.statusBadge,
                                backgroundColor: club.isActive && !isExpired ? 'rgba(47, 158, 99, 0.2)' : 'rgba(139, 38, 53, 0.2)',
                                color: club.isActive && !isExpired ? 'var(--green-go)' : 'var(--rail-300)',
                                border: `1px solid ${club.isActive && !isExpired ? 'var(--green-go)' : 'var(--rail-600)'}`
                              }}
                            >
                              {club.isActive && !isExpired ? 'Active / Enabled' : 'Disabled'}
                            </button>
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              color: isExpired ? 'var(--rail-300)' : club.expiryDate ? 'var(--chalk-100)' : 'var(--brass-300)',
                              fontWeight: 500
                            }}>
                              {daysLeftText}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <button onClick={() => openEditModal(club)} style={styles.editBtn}>
                              Edit Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div style={styles.paginationRow}>
                  <span style={styles.paginationInfo}>
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClubs.length)} of {filteredClubs.length} clubs
                  </span>
                  <div style={styles.paginationBtns}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={currentPage === 1 ? styles.pageBtnDisabled : styles.pageBtn}
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={page === currentPage ? styles.pageBtnActive : styles.pageBtn}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={currentPage === totalPages ? styles.pageBtnDisabled : styles.pageBtn}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Onboard Modal */}
      {showAddModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Onboard New Club</h2>
            {addError && <div style={styles.errorBox}>{addError}</div>}
            <form onSubmit={handleAddSubmit} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Club Name</label>
                <input
                  style={styles.modalInput}
                  placeholder="e.g. Royal Billiards"
                  value={addForm.name}
                  onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Owner's Full Name</label>
                <input
                  style={styles.modalInput}
                  placeholder="e.g. Rajesh Kumar"
                  value={addForm.ownerName}
                  onChange={e => setAddForm(prev => ({ ...prev, ownerName: e.target.value }))}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.modalLabel}>Owner Username</label>
                  <input
                    style={styles.modalInput}
                    placeholder="e.g. rajesh123"
                    value={addForm.username}
                    onChange={e => setAddForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.modalLabel}>Initial Password</label>
                  <input
                    style={styles.modalInput}
                    placeholder="e.g. TemporaryPass1"
                    value={addForm.password}
                    onChange={e => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Trial Duration (Days)</label>
                <input
                  type="number"
                  style={styles.modalInput}
                  value={addForm.validityDays}
                  onChange={e => setAddForm(prev => ({ ...prev, validityDays: e.target.value }))}
                  min="1"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Club Logo (All formats, 10MB max)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleLogoChange(e.target.files[0], false)}
                  style={styles.fileInput}
                />
                <span style={styles.fileHelp}>Supports PNG, JPG, JPEG, SVG, WebP, GIF.</span>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowAddModal(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={addLoading} style={styles.saveBtn}>
                  {addLoading ? 'Onboarding...' : 'Onboard Club'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Details & Expiry Modal */}
      {showEditModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Edit Club - {editingClub?.name}</h2>
            {editError && <div style={styles.errorBox}>{editError}</div>}
            <form onSubmit={handleEditSubmit} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Club Name</label>
                <input
                  style={styles.modalInput}
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Owner Name</label>
                <input
                  style={styles.modalInput}
                  value={editForm.ownerName}
                  onChange={e => setEditForm(prev => ({ ...prev, ownerName: e.target.value }))}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.modalLabel}>Owner Username</label>
                  <input
                    style={styles.modalInput}
                    value={editForm.username}
                    onChange={e => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.modalLabel}>Update Password (leave blank to keep current)</label>
                  <input
                    style={styles.modalInput}
                    placeholder="New password..."
                    value={editForm.password}
                    onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.modalLabel}>Subscription Expiry Date</label>
                  <input
                    type="date"
                    min={todayDateStr}
                    style={styles.modalInput}
                    value={editForm.expiryDateStr}
                    onChange={e => setEditForm(prev => ({ ...prev, expiryDateStr: e.target.value }))}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.modalLabel}>Club Status</label>
                  <select
                    style={styles.modalSelect}
                    value={editForm.isActive ? 'true' : 'false'}
                    onChange={e => setEditForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                  >
                    <option value="true">Enabled (Can Log In)</option>
                    <option value="false">Disabled (Blocked)</option>
                  </select>
                </div>
              </div>

              {/* Logo upload field */}
              <div style={styles.formGroup}>
                <label style={styles.modalLabel}>Upload New Logo (All formats, 10MB max)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleLogoChange(e.target.files[0], true)}
                  style={styles.fileInput}
                />
                <span style={styles.fileHelp}>Supports PNG, JPG, JPEG, SVG, WebP, GIF.</span>
              </div>

              <div style={{ ...styles.modalFooter, justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={handleDeleteClub}
                  style={styles.deleteClubBtn}
                  disabled={editLoading || logoUploading}
                >
                  Delete Club
                </button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setShowEditModal(false)} style={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" disabled={editLoading || logoUploading} style={styles.saveBtn}>
                    {editLoading ? 'Saving...' : logoUploading ? 'Uploading Logo...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--felt-900)',
    color: 'var(--chalk-100)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--font-body)',
  },
  header: {
    height: 70,
    background: 'rgba(21, 29, 26, 0.65)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerCrown: {
    fontSize: '1.6rem',
  },
  headerTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.4rem',
    color: 'var(--brass-300)',
    margin: 0,
    fontWeight: 600,
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  signedInAs: {
    fontSize: '0.88rem',
    color: 'var(--chalk-400)',
  },
  logoutBtn: {
    background: 'rgba(201, 162, 75, 0.05)',
    border: '1px solid var(--brass-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--brass-300)',
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
  },
  main: {
    flex: 1,
    padding: '32px',
    maxWidth: 1280,
    width: '100%',
    margin: '0 auto',
  },
  statsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 24,
    marginBottom: 32,
  },
  statsCard: {
    background: 'var(--felt-700)',
    borderLeft: '4px solid var(--brass-500)',
    borderRadius: 'var(--radius-md)',
    padding: '20px 24px',
    boxShadow: 'var(--shadow-card)',
    display: 'flex',
    flexDirection: 'column',
  },
  statsLabel: {
    fontSize: '0.85rem',
    color: 'var(--chalk-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: '2rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--chalk-100)',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    maxWidth: 400,
    background: 'var(--felt-700)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 14px',
    fontSize: '0.9rem',
    outline: 'none',
  },
  addClubBtn: {
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 20px',
    fontWeight: 700,
    fontSize: '0.9rem',
    transition: 'background 0.2s',
  },
  tableCard: {
    background: 'var(--felt-700)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-card)',
    overflow: 'hidden',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '16px 20px',
    borderBottom: '2px solid var(--felt-900)',
    color: 'var(--brass-300)',
    fontSize: '0.85rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid var(--felt-900)',
    '&:hover': {
      backgroundColor: 'var(--felt-600)',
    }
  },
  td: {
    padding: '16px 20px',
    fontSize: '0.92rem',
    color: 'var(--chalk-200)',
  },
  logoImg: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid var(--brass-500)',
    background: '#fff',
  },
  logoPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'var(--felt-500)',
    color: 'var(--chalk-100)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    border: '1px solid var(--felt-500)',
  },
  clubNameCell: {
    fontWeight: 600,
    color: 'var(--chalk-100)',
  },
  subdomainCell: {
    fontSize: '0.78rem',
    color: 'var(--chalk-400)',
    marginTop: 2,
    fontFamily: 'var(--font-mono)',
  },
  statusBadge: {
    border: 'none',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    outline: 'none',
  },
  editBtn: {
    background: 'none',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--brass-300)',
    padding: '6px 12px',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  errorBanner: {
    background: 'rgba(139, 38, 53, 0.2)',
    borderBottom: '1px solid var(--rail-600)',
    color: 'var(--rail-300)',
    padding: '12px 20px',
    fontSize: '0.88rem',
  },
  loadingBanner: {
    padding: 40,
    textAlign: 'center',
    color: 'var(--chalk-400)',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(11, 43, 34, 0.7)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: 600,
    padding: '32px',
    boxShadow: 'var(--shadow-raised)',
  },
  modalTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    color: 'var(--brass-300)',
    margin: '0 0 24px 0',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  formRow: {
    display: 'flex',
    gap: 20,
  },
  formGroup: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  modalLabel: {
    fontSize: '0.8rem',
    color: 'var(--chalk-400)',
    fontWeight: 600,
    marginBottom: 6,
  },
  modalInput: {
    background: 'var(--felt-700)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    outline: 'none',
  },
  modalSelect: {
    background: 'var(--felt-700)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '10px 12px',
    fontSize: '0.9rem',
    outline: 'none',
    cursor: 'pointer',
  },
  fileInput: {
    color: 'var(--chalk-400)',
    fontSize: '0.85rem',
  },
  fileHelp: {
    fontSize: '0.75rem',
    color: 'var(--chalk-400)',
    marginTop: 4,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    background: 'none',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-400)',
    padding: '10px 18px',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  saveBtn: {
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 18px',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  deleteClubBtn: {
    background: 'rgba(139, 38, 53, 0.1)',
    border: '1px solid var(--rail-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--rail-300)',
    padding: '10px 18px',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  paginationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: 'rgba(255, 255, 255, 0.01)',
    borderTop: '1px solid var(--felt-900)',
  },
  paginationInfo: {
    fontSize: '0.82rem',
    color: 'var(--chalk-400)',
  },
  paginationBtns: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  pageBtn: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-200)',
    padding: '6px 12px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    outline: 'none',
  },
  pageBtnActive: {
    background: 'var(--brass-500)',
    border: '1px solid var(--brass-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--ink-900)',
    padding: '6px 12px',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    outline: 'none',
  },
  pageBtnDisabled: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-700)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-500)',
    padding: '6px 12px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'not-allowed',
    opacity: 0.5,
    outline: 'none',
  },
  errorBox: {
    background: 'rgba(139, 38, 53, 0.2)',
    border: '1px solid var(--rail-600)',
    color: 'var(--rail-300)',
    padding: '10px 14px',
    fontSize: '0.85rem',
    borderRadius: 'var(--radius-sm)',
  },
};
