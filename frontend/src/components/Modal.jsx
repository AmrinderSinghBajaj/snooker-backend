export default function Modal({ title, onClose, children, width = 420, hideClose = false }) {
  return (
    <div style={styles.overlay} onClick={hideClose ? undefined : onClose}>
      <div style={{ ...styles.panel, width }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          {!hideClose && (
            <button onClick={onClose} style={styles.closeBtn} aria-label="Close">
              ×
            </button>
          )}
        </div>
        <div style={styles.content}>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(11, 43, 34, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'rowFadeIn 0.15s ease',
    backdropFilter: 'blur(2px)',
  },
  panel: {
    background: 'var(--felt-700)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-raised)',
    maxHeight: '85vh',
    overflowY: 'auto',
    animation: 'modalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 22px',
    borderBottom: '1px solid var(--felt-600)',
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: '1.15rem',
    color: 'var(--chalk-100)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--chalk-400)',
    fontSize: '1.5rem',
    lineHeight: 1,
    padding: 0,
  },
  content: {
    padding: 22,
  },
};
