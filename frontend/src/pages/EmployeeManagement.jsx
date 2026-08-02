import { useState, useEffect } from 'react';
import { staffApi } from '../api/endpoints';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useTranslation } from '../utils/translations';

const MODULES = [
  { key: 'dashboard', labelKey: 'dashboard', actions: ['view'] },
  { key: 'tables', labelKey: 'tablesPlaystation', actions: ['view', 'edit', 'delete'] },
  { key: 'billing', labelKey: 'billing', actions: ['view', 'edit', 'delete'] },
  { key: 'foodDrink', labelKey: 'foodDrink', actions: ['view', 'edit', 'delete'] },
  { key: 'customers', labelKey: 'customers', actions: ['view', 'edit', 'delete'] },
  { key: 'advancePay', labelKey: 'advancePayments', actions: ['view', 'edit', 'delete'] },
  { key: 'revenue', labelKey: 'revenue', actions: ['view'] },
  { key: 'settings', labelKey: 'settings', actions: ['view', 'edit'] }
];

const DEFAULT_PERMISSIONS = {
  dashboard:   { view: false },
  customers:   { view: false, edit: false, delete: false },
  billing:     { view: false, edit: false, delete: false },
  tables:      { view: false, edit: false, delete: false },
  foodDrink:   { view: false, edit: false, delete: false },
  advancePay:  { view: false, edit: false, delete: false },
  revenue:     { view: false },
  settings:    { view: false, edit: false }
};

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function EmployeeManagement() {
  const { t } = useTranslation();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const loadStaff = () => {
    setLoading(true);
    staffApi.list()
      .then((res) => setStaffList(res.data))
      .catch(() => setError('Failed to load employee records.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const openAddModal = () => {
    setEditingStaff(null);
    setFullName('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setPermissions(DEFAULT_PERMISSIONS);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setFullName(staff.fullName);
    setUsername(staff.username);
    setPassword(''); // blank to keep unchanged
    setShowPassword(false);
    
    // Merge standard structure with loaded permissions to avoid gaps
    const mergedPerms = {};
    Object.keys(DEFAULT_PERMISSIONS).forEach(moduleKey => {
      mergedPerms[moduleKey] = {
        ...DEFAULT_PERMISSIONS[moduleKey],
        ...(staff.permissions?.[moduleKey] || {})
      };
    });
    setPermissions(mergedPerms);
    setError('');
    setShowModal(true);
  };

  const handlePermissionChange = (moduleKey, action, value) => {
    setPermissions(prev => {
      const updatedModule = { ...prev[moduleKey] };

      if (action === 'view' && !value) {
        // If View is unchecked, turn off all actions for this module
        Object.keys(updatedModule).forEach(k => {
          updatedModule[k] = false;
        });
      } else if (action !== 'view' && value) {
        // If any action (edit/delete) is checked, View must be checked
        updatedModule.view = true;
        updatedModule[action] = true;
      } else {
        updatedModule[action] = value;
      }

      return {
        ...prev,
        [moduleKey]: updatedModule
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!fullName.trim() || !username.trim()) {
      setError('Full Name and Username are required.');
      return;
    }

    if (!editingStaff && !password.trim()) {
      setError('Password is required for new employees.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        permissions
      };
      if (password.trim()) {
        payload.password = password.trim();
      }

      if (editingStaff) {
        await staffApi.update(editingStaff.id, payload);
        setToast(t('staffSaved'));
      } else {
        payload.username = username.trim();
        await staffApi.create(payload);
        setToast(t('staffSaved'));
      }
      
      setShowModal(false);
      loadStaff();
    } catch (err) {
      setError(err.response?.data?.detail || t('errorSavingStaff'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmed = window.confirm(t('removeStaffConfirmed'));
    if (!confirmed) return;

    try {
      await staffApi.remove(id);
      setToast(t('removedStaff'));
      loadStaff();
    } catch (err) {
      setError(err.response?.data?.detail || t('couldNotRemoveStaff'));
    }
  };

  return (
    <div className="staff-page" style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>{t('employeeManagement')}</h1>
          <p style={styles.subtitle}>Create and configure employee credentials with granular system privileges.</p>
        </div>
        <button onClick={openAddModal} className="btn-primary" style={styles.addBtn}>
          + {t('addStaff')}
        </button>
      </header>

      {toast && <div style={styles.toast}>{toast}</div>}
      {error && <div style={styles.errorAlert}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>{t('loading')}</div>
      ) : staffList.length === 0 ? (
        <Card style={styles.emptyCard}>
          <div style={styles.emptyIcon}>👥</div>
          <p style={styles.emptyText}>{t('noStaffFound')}</p>
        </Card>
      ) : (
        <div style={styles.grid}>
          {staffList.map((staff) => (
            <Card key={staff.id} style={styles.staffCard}>
              <div style={styles.staffHeader}>
                <div style={styles.avatar}>👤</div>
                <div>
                  <h3 style={styles.staffName}>{staff.fullName}</h3>
                  <div style={styles.staffUsername}>@{staff.username}</div>
                </div>
              </div>
              
              <div style={styles.staffMeta}>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Role:</span>
                  <span style={styles.metaValue}>Employee</span>
                </div>
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Password:</span>
                  <span style={styles.passwordVal} title="Shared plain password for convenience">
                    {staff.plainPassword || '••••••••'}
                  </span>
                </div>
              </div>

              <div style={styles.activePermsSummary}>
                <div style={styles.permsSummaryTitle}>{t('permissions')}:</div>
                <div style={styles.badgeContainer}>
                  {MODULES.map(mod => {
                    const viewChecked = staff.permissions?.[mod.key]?.view;
                    const editChecked = staff.permissions?.[mod.key]?.edit;
                    const deleteChecked = staff.permissions?.[mod.key]?.delete;
                    
                    if (!viewChecked) return null;
                    
                    let level = 'View';
                    if (editChecked) level = 'Edit';
                    if (deleteChecked) level = 'Delete';
                    
                    return (
                      <span key={mod.key} style={styles.permBadge}>
                        {t(mod.labelKey)} ({level})
                      </span>
                    );
                  })}
                  {Object.values(staff.permissions || {}).every(p => !p.view) && (
                    <span style={styles.noPermBadge}>No access configured</span>
                  )}
                </div>
              </div>

              <div style={styles.cardActions}>
                <button onClick={() => openEditModal(staff)} style={styles.editBtn}>
                  {t('edit')}
                </button>
                <button onClick={() => handleDelete(staff.id, staff.fullName)} style={styles.deleteBtn}>
                  {t('remove')}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={editingStaff ? t('editStaff') : t('addStaff')}
          onClose={() => setShowModal(false)}
          width={580}
        >
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{t('fullNameLabel')}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={styles.input}
                placeholder="e.g. John Doe"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t('usernameLabel')}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                placeholder="e.g. johndoe12"
                disabled={!!editingStaff}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                {editingStaff ? t('passwordLabel') : t('passwordLabelNew')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...styles.input, width: '100%', paddingRight: '45px' }}
                  placeholder={editingStaff ? "••••••••" : "Enter password"}
                  required={!editingStaff}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t('permissionsMatrix')}</label>
              <div style={styles.matrixContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tr}>
                      <th style={styles.th}>{t('moduleHeader')}</th>
                      <th style={styles.thCentered}>{t('viewHeader')}</th>
                      <th style={styles.thCentered}>{t('editHeader')}</th>
                      <th style={styles.thCentered}>{t('deleteHeader')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((mod) => {
                      const hasView = mod.actions.includes('view');
                      const hasEdit = mod.actions.includes('edit');
                      const hasDelete = mod.actions.includes('delete');
                      
                      const viewVal = permissions[mod.key]?.view || false;
                      const editVal = permissions[mod.key]?.edit || false;
                      const deleteVal = permissions[mod.key]?.delete || false;

                      return (
                        <tr key={mod.key} style={styles.tr}>
                          <td style={styles.tdName}>{t(mod.labelKey)}</td>
                          <td style={styles.tdCheckbox}>
                            {hasView ? (
                              <input
                                type="checkbox"
                                checked={viewVal}
                                onChange={(e) => handlePermissionChange(mod.key, 'view', e.target.checked)}
                                style={styles.checkbox}
                              />
                            ) : '—'}
                          </td>
                          <td style={styles.tdCheckbox}>
                            {hasEdit ? (
                              <input
                                type="checkbox"
                                checked={editVal}
                                disabled={!viewVal}
                                onChange={(e) => handlePermissionChange(mod.key, 'edit', e.target.checked)}
                                style={styles.checkbox}
                              />
                            ) : '—'}
                          </td>
                          <td style={styles.tdCheckbox}>
                            {hasDelete ? (
                              <input
                                type="checkbox"
                                checked={deleteVal}
                                disabled={!viewVal}
                                onChange={(e) => handlePermissionChange(mod.key, 'delete', e.target.checked)}
                                style={styles.checkbox}
                              />
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={styles.cancelBtn}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={styles.saveBtn}
              >
                {submitting ? t('savingStaff') : t('saveStaff')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 8px',
    maxWidth: 1200,
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    color: 'var(--brass-300)',
  },
  subtitle: {
    margin: '4px 0 0 0',
    color: 'var(--chalk-400)',
    fontSize: '0.95rem',
  },
  addBtn: {
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'var(--brass-500)',
    color: 'var(--felt-900)',
    transition: 'background 0.2s',
  },
  toast: {
    padding: '12px 18px',
    background: 'var(--green-go)',
    color: 'var(--chalk-100)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: 16,
    fontWeight: 500,
    boxShadow: 'var(--shadow-card)',
  },
  errorAlert: {
    padding: '12px 18px',
    background: 'var(--rail-600)',
    color: 'var(--chalk-100)',
    borderRadius: 'var(--radius-sm)',
    marginBottom: 16,
    fontWeight: 500,
    boxShadow: 'var(--shadow-card)',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 0',
    color: 'var(--chalk-400)',
    fontFamily: 'var(--font-mono)',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: 16,
  },
  emptyText: {
    color: 'var(--chalk-400)',
    fontSize: '1rem',
    maxWidth: 400,
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 20,
  },
  staffCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 220,
  },
  staffHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    fontSize: '2rem',
    background: 'var(--felt-600)',
    borderRadius: '50%',
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--felt-500)',
  },
  staffName: {
    margin: 0,
    fontSize: '1.15rem',
    color: 'var(--chalk-100)',
    fontWeight: 600,
  },
  staffUsername: {
    fontSize: '0.85rem',
    color: 'var(--brass-500)',
  },
  staffMeta: {
    borderTop: '1px solid var(--felt-600)',
    paddingTop: 12,
    marginBottom: 12,
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.88rem',
    marginBottom: 6,
  },
  metaLabel: {
    color: 'var(--chalk-400)',
  },
  metaValue: {
    color: 'var(--chalk-200)',
    fontWeight: 500,
  },
  passwordVal: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--chalk-200)',
    fontWeight: 500,
  },
  activePermsSummary: {
    borderTop: '1px solid var(--felt-600)',
    paddingTop: 12,
    marginBottom: 16,
  },
  permsSummaryTitle: {
    fontSize: '0.85rem',
    color: 'var(--chalk-400)',
    marginBottom: 8,
    fontWeight: 500,
  },
  badgeContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  permBadge: {
    fontSize: '0.72rem',
    background: 'var(--felt-600)',
    color: 'var(--chalk-100)',
    border: '1px solid var(--felt-500)',
    padding: '3px 8px',
    borderRadius: '12px',
    fontWeight: 500,
  },
  noPermBadge: {
    fontSize: '0.75rem',
    color: 'var(--rail-300)',
    fontStyle: 'italic',
  },
  cardActions: {
    display: 'flex',
    gap: 12,
    borderTop: '1px solid var(--felt-600)',
    paddingTop: 14,
    marginTop: 'auto',
  },
  editBtn: {
    flex: 1,
    padding: '8px 0',
    background: 'transparent',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-200)',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'background 0.2s, border 0.2s',
  },
  deleteBtn: {
    flex: 1,
    padding: '8px 0',
    background: 'transparent',
    border: '1px solid var(--rail-600)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--rail-300)',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'background 0.2s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--chalk-300)',
  },
  input: {
    background: 'var(--felt-800)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    color: 'var(--chalk-100)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  matrixContainer: {
    border: '1px solid var(--felt-600)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--felt-800)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.88rem',
    tableLayout: 'fixed',
  },
  tr: {
    borderBottom: '1px solid var(--felt-600)',
  },
  th: {
    padding: '10px 14px',
    background: 'var(--felt-900)',
    color: 'var(--chalk-400)',
    textAlign: 'left',
    fontWeight: 600,
    width: '40%',
  },
  thCentered: {
    padding: '10px 14px',
    background: 'var(--felt-900)',
    color: 'var(--chalk-400)',
    textAlign: 'center',
    fontWeight: 600,
    width: '20%',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: 'var(--chalk-400)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    outline: 'none',
    transition: 'color 0.2s',
  },
  tdName: {
    padding: '10px 14px',
    color: 'var(--chalk-100)',
    fontWeight: 500,
  },
  tdCheckbox: {
    padding: '10px 14px',
    textAlign: 'center',
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'pointer',
    accentColor: 'var(--brass-500)',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    padding: '10px 22px',
    background: 'transparent',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-300)',
    cursor: 'pointer',
    fontWeight: 600,
  },
  saveBtn: {
    padding: '10px 22px',
    background: 'var(--brass-500)',
    color: 'var(--felt-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontWeight: 600,
  }
};
