import { useState } from 'react';

function Brand() {
  return <a className="brand auth-brand" href="/" aria-label="W-COM home"><span className="brand-mark"><span>W</span></span><span className="brand-copy"><strong>W-COM</strong><small>WAHAN COMMERCE</small></span></a>;
}

export default function AuthScreen({ initialError = '', onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [adminLogin, setAdminLogin] = useState(false);
  const [showOtpPreview, setShowOtpPreview] = useState(false);
  const [form, setForm] = useState({ company: '', gstNo: '', email: '', phone: '', password: '' });
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const endpoint = adminLogin
        ? '/api/auth/admin/login'
        : mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = adminLogin || mode === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to sign in right now.');
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const openAdminLogin = () => {
    setAdminLogin(true);
    setMode('login');
    setShowOtpPreview(false);
    setForm({ company: '', gstNo: '', email: '', phone: '', password: '' });
    setError('');
  };

  const openCustomerLogin = () => {
    setAdminLogin(false);
    setMode('login');
    setShowOtpPreview(false);
    setForm({ company: '', gstNo: '', email: '', phone: '', password: '' });
    setError('');
  };

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const registering = !adminLogin && mode === 'register';

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-content">
          <span className="hero-kicker"><span /> WAHAN ENGINEERING CORPORATION</span>
          <h1>Business moves<br />better <span>together.</span></h1>
          <p>Your parts catalogue, quotation requests, and Wahan team — all connected in one place.</p>
          <div className="auth-flow">
            <span><i>01</i> Discover parts</span><b>—</b><span><i>02</i> Request a quote</span><b>—</b><span><i>03</i> Get moving</span>
          </div>
        </div>
        <div className="auth-story-footer"><span>WAHAN COMMERCE</span><span>CONNECTED BUSINESS DATA · PRODUCT DISCOVERY</span></div>
        <div className="auth-story-orbit" aria-hidden="true"><div /><div /><span>W</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <Brand />
          {showOtpPreview ? (
            <div className="auth-card otp-preview">
              <button className="auth-back-link" onClick={() => setShowOtpPreview(false)}>← Back to sign in</button>
              <span className="auth-card-icon">✳</span>
              <span className="drawer-kicker">FUTURE SIGN-IN STEP</span>
              <h2>Verify your email</h2>
              <p className="auth-description">A one-time code verification screen for a future email authentication integration.</p>
              <label className="auth-field"><span>Verification code</span><input disabled placeholder="· · · · · ·" inputMode="numeric" /></label>
              <button className="button button-primary auth-submit" disabled>Verify code <span>→</span></button>
              <p className="auth-muted-note">OTP delivery and verification are not configured yet. This preview does not send or validate a code.</p>
            </div>
          ) : (
            <div className="auth-card">
              <div className="auth-card-kicker"><span className="eyebrow-dot" /> {adminLogin ? 'ADMINISTRATOR ACCESS' : 'CUSTOMER PORTAL'}</div>
              <h2>{adminLogin ? 'Admin sign in' : registering ? 'Create your account' : 'Welcome back'}</h2>
              <p className="auth-description">{adminLogin ? 'Sign in to manage requests and customer assignments.' : registering ? 'Set up your W-COM customer account to get started.' : 'Sign in to explore parts and manage your quotation requests.'}</p>

              {error && <div className="alert alert-error auth-alert" role="alert">{error}</div>}
              <form className="auth-form" onSubmit={submit}>
                {registering && <>
                  <label className="auth-field"><span>Company name</span><input required minLength="2" maxLength="120" autoComplete="organization" value={form.company} onChange={(event) => updateField('company', event.target.value)} placeholder="Your registered company name" /></label>
                  <label className="auth-field"><span>GST number</span><input required minLength="15" maxLength="15" pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z]Z[0-9A-Za-z]" value={form.gstNo} onChange={(event) => updateField('gstNo', event.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" /></label>
                  <label className="auth-field"><span>Phone number</span><input required type="tel" minLength="10" maxLength="20" pattern="[+]?[0-9 ()-]{10,20}" autoComplete="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+91 98765 43210" /></label>
                </>}
                <label className="auth-field"><span>Email address</span><input required type="email" maxLength="254" autoComplete="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="you@company.com" /></label>
                <label className="auth-field"><span>Password</span><input required type="password" minLength={registering ? 8 : undefined} maxLength="128" autoComplete={registering ? 'new-password' : 'current-password'} value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder={registering ? 'At least 8 characters' : 'Enter your password'} /></label>
                {registering && <p className="auth-password-hint">Use at least 8 characters. OTP email verification will be added when authentication services are configured.</p>}
                <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : adminLogin ? 'Sign in to admin' : registering ? 'Create customer account' : 'Sign in'} <span>→</span></button>
              </form>

              {!adminLogin && <>
                <div className="auth-divider"><span /> <small>OR</small> <span /></div>
                <button className="google-signin" onClick={() => setError('Google sign-in is not connected yet. Email and password sign-in is available.')}>
                  <span className="google-g">G</span> Continue with Google <small>COMING SOON</small>
                </button>
                <p className="auth-mode-switch">{registering ? 'Already have an account?' : 'New to W-COM?'} <button onClick={() => { setMode(registering ? 'login' : 'register'); setError(''); }}> {registering ? 'Sign in' : 'Create an account'}</button></p>
              </>}
              {adminLogin && <p className="auth-muted-note">Admin login must be configured on the server using WCOM_ADMIN_EMAIL and WCOM_ADMIN_PASSWORD.</p>}
            </div>
          )}
          <p className="auth-legal">{adminLogin ? 'Administrator access is limited to the configured W-COM admin account.' : 'By continuing, you agree to Wahan Engineering’s customer portal terms.'}</p>
          <div className="auth-panel-footer"><button onClick={adminLogin ? openCustomerLogin : openAdminLogin}>{adminLogin ? 'Customer sign in' : 'Administrator access'}</button><span>© 2025 Wahan Engineering</span></div>
        </div>
      </section>
    </main>
  );
}
