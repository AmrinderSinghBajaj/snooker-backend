import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import Logo from '../components/Logo';

/*
  FRD B.1 - Initial Screen (Animation):
  "When the URL is opened, a 2-second animation showing the Club Name will
  appear. After 2 seconds, the user is moved to the login area on the right
  half of the screen."

  We honor that exact structure: a full-bleed intro of the club name first,
  then the screen splits and the login form occupies the right half.
  Club name / logo are white-label: pulled from BrandingContext, never
  hardcoded, so this exact screen works unchanged for any club.
*/
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [introDone, setIntroDone] = useState(() => {
    return !!location.state?.skipIntro;
  });
  const [showOverlay, setShowOverlay] = useState(!introDone);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { club_name } = useBranding();

  useEffect(() => {
    if (introDone) {
      setShowOverlay(false);
      return;
    }
    const timer = setTimeout(() => {
      setIntroDone(true);
      const hideTimer = setTimeout(() => setShowOverlay(false), 600);
      return () => clearTimeout(hideTimer);
    }, 2000);
    return () => clearTimeout(timer);
  }, [introDone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Could not sign in. Check your username and password.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Left half: club identity, always present as the "world" the panel lives in */}
      <div className="login-left-half" style={styles.leftHalf}>
        <Logo size={180} />
        <h1 style={styles.clubName}>{club_name}</h1>
        <p style={styles.tagline}>Floor &amp; ledger, in one place.</p>
      </div>

      {/* Right half: login form, revealed once the 2s intro completes */}
      <div
        className="login-right-half"
        style={{
          ...styles.rightHalf,
          opacity: introDone ? 1 : 0,
          transform: introDone ? 'translateX(0)' : 'translateX(24px)',
        }}
      >
        {introDone && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div className="login-mobile-header">
              <Logo size={56} />
              <h1 className="login-mobile-title">{club_name}</h1>
            </div>
            <span style={styles.eyebrow}>Club Owner Access</span>
            <h2 style={styles.formTitle}>Sign in</h2>

            <label style={styles.label} htmlFor="username">Username</label>
            <input
              id="username"
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />

            <label style={styles.label} htmlFor="password">Password</label>
            <div style={styles.inputContainer}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                style={styles.passwordInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>

            {error && <div style={styles.error} role="alert">{error}</div>}

            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </div>

      {/* Full-bleed intro overlay, fades out after 2s */}
      {showOverlay && (
        <div
          style={{
            ...styles.introOverlay,
            opacity: introDone ? 0 : 1,
            pointerEvents: introDone ? 'none' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          <Logo size={96} />
          <h1 style={styles.introTitle}>{club_name}</h1>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    position: 'relative',
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    overflow: 'hidden',
    background: 'var(--felt-900)',
  },
  leftHalf: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 40px',
    background:
      'radial-gradient(circle at 30% 20%, var(--felt-700), var(--felt-900) 70%)',
    borderRight: '1px solid var(--felt-600)',
  },
  clubName: {
    fontFamily: 'var(--font-display)',
    fontSize: '2.4rem',
    fontWeight: 600,
    color: 'var(--chalk-100)',
    margin: '24px 0 0',
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'var(--font-body)',
    color: 'var(--chalk-400)',
    marginTop: 8,
    fontSize: '0.95rem',
  },
  rightHalf: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--felt-800)',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: 340,
    padding: '0 32px',
  },
  eyebrow: {
    fontSize: '0.72rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--brass-300)',
    fontWeight: 600,
  },
  formTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.8rem',
    color: 'var(--chalk-100)',
    margin: '6px 0 28px',
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--chalk-400)',
    marginBottom: 6,
    fontWeight: 500,
  },
  input: {
    background: 'var(--felt-700)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '11px 14px',
    fontSize: '0.95rem',
    marginBottom: 18,
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 18,
  },
  passwordInput: {
    width: '100%',
    background: 'var(--felt-700)',
    border: '1px solid var(--felt-500)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--chalk-100)',
    padding: '11px 44px 11px 14px',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--chalk-400)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    outline: 'none',
  },
  submitBtn: {
    marginTop: 8,
    background: 'var(--brass-500)',
    color: 'var(--ink-900)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 0',
    fontWeight: 700,
    fontSize: '0.95rem',
    transition: 'background 0.2s ease',
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
  introOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--felt-900)',
    transition: 'opacity 0.6s ease',
  },
  introTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '3rem',
    fontWeight: 700,
    color: 'var(--chalk-100)',
    letterSpacing: '0.01em',
  },
};
