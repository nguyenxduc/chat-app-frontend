import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff, MessageCircle } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { requestPasswordReset, resetPassword } from '../lib/authApi';
import { GoogleSignInButton } from './GoogleSignInButton';

type AuthTab = 'login' | 'register' | 'forgot';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label
        className="text-xs font-medium mb-1.5 block"
        style={{ color: '#7a7a9a', fontFamily: 'var(--font-family-display)' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full px-4 py-3 rounded-xl outline-none text-sm transition-all duration-200';
const inputStyle = {
  background: '#1e1e38',
  color: '#f0eeff',
  border: '1px solid rgba(124,92,191,0.25)',
  fontFamily: 'var(--font-family-body)',
} as const;

export function AuthScreen() {
  const { login, register, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [tab, setTab] = useState<AuthTab>('login');
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot-password flow
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  const fail = (message: string) => {
    setError(message);
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.email || !form.password) {
      fail('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      if (tab === 'login') {
        await login({ email: form.email.trim(), password: form.password });
      } else {
        if (form.name.trim().length < 3) {
          fail('Full name must be at least 3 characters.');
          setLoading(false);
          return;
        }
        await register({
          email: form.email.trim(),
          password: form.password,
          displayName: form.name.trim(),
        });
      }
      navigate(from, { replace: true });
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const onGoogleCredential = useCallback(
    (idToken: string) => {
      setError(null);
      void loginGoogle(idToken)
        .then(() => navigate(from, { replace: true }))
        .catch((err: unknown) => fail(err instanceof Error ? err.message : 'Google sign-in failed'));
    },
    [loginGoogle, navigate, from],
  );

  async function handleResetRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { message } = await requestPasswordReset(resetEmail.trim());
      setResetInfo(message);
      setResetStep('reset');
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Failed to request reset code');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      fail('Password must be at least 8 characters.');
      return;
    }
    if (otp.trim().length !== 6) {
      fail('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ email: resetEmail.trim(), otp: otp.trim(), newPassword });
      setTab('login');
      setResetStep('request');
      setResetInfo(null);
      setOtp('');
      setNewPassword('');
      setForm((p) => ({ ...p, email: resetEmail, password: '' }));
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="size-full flex items-center justify-center relative overflow-hidden"
      style={{ background: '#0d0d1a' }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full opacity-20"
          style={{ width: 560, height: 560, background: 'radial-gradient(circle, #7c5cbf 0%, transparent 70%)', top: -160, right: -160 }}
        />
        <div
          className="absolute rounded-full opacity-10"
          style={{ width: 400, height: 400, background: 'radial-gradient(circle, #ff8906 0%, transparent 70%)', bottom: -100, left: -100 }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#7c5cbf' }}>
            <MessageCircle size={18} color="white" fill="white" />
          </div>
          <span
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: 'var(--font-family-display)' }}
          >
            Helix
          </span>
        </div>

        {tab !== 'forgot' && (
          <div className="flex rounded-xl p-1 mb-8" style={{ background: '#16162a' }}>
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setError(null);
                }}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  fontFamily: 'var(--font-family-display)',
                  background: tab === t ? '#7c5cbf' : 'transparent',
                  color: tab === t ? 'white' : '#7a7a9a',
                }}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>
        )}

        {tab !== 'forgot' ? (
          <form onSubmit={handleAuthSubmit} className={shake ? 'animate-shake' : ''}>
            <div className="flex flex-col gap-4">
              {tab === 'register' && (
                <Field label="Full Name">
                  <input
                    type="text"
                    placeholder="Alex Rivera"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
              )}
              <Field label="Email">
                <input
                  type="email"
                  placeholder="alex@example.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
              <Field label="Password">
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className={inputClass}
                    style={{ ...inputStyle, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                    style={{ color: '#f0eeff' }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
            </div>

            {tab === 'login' && (
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTab('forgot');
                    setResetEmail(form.email);
                    setError(null);
                  }}
                  className="text-xs hover:opacity-80 transition-opacity"
                  style={{ color: '#7c5cbf' }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <p className="mt-3 text-xs" style={{ color: '#e53e3e' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
              style={{ background: loading ? '#5a3f8f' : '#7c5cbf', color: 'white', fontFamily: 'var(--font-family-display)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {tab === 'login' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : tab === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>

            <div className="my-5 flex items-center gap-2 text-xs" style={{ color: '#4a4a6a' }}>
              <span className="h-px flex-1" style={{ background: 'rgba(124,92,191,0.2)' }} />
              or
              <span className="h-px flex-1" style={{ background: 'rgba(124,92,191,0.2)' }} />
            </div>

            <GoogleSignInButton onCredential={onGoogleCredential} onError={fail} />
          </form>
        ) : resetStep === 'request' ? (
          <form onSubmit={handleResetRequest} className={shake ? 'animate-shake' : ''}>
            <p className="text-sm mb-4" style={{ color: '#7a7a9a' }}>
              Enter your email and we'll send you a 6-digit reset code.
            </p>
            <Field label="Email">
              <input
                type="email"
                placeholder="alex@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </Field>
            {error && (
              <p className="mt-3 text-xs" style={{ color: '#e53e3e' }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{ background: '#7c5cbf', color: 'white', fontFamily: 'var(--font-family-display)' }}
            >
              {loading ? 'Sending…' : 'Send reset code'}
            </button>
            <button
              type="button"
              onClick={() => setTab('login')}
              className="w-full mt-3 text-xs hover:opacity-80 transition-opacity"
              style={{ color: '#7c5cbf' }}
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className={shake ? 'animate-shake' : ''}>
            {resetInfo && (
              <p className="text-sm mb-4" style={{ color: '#4ade80' }}>
                {resetInfo}
              </p>
            )}
            <div className="flex flex-col gap-4">
              <Field label="6-digit code">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className={`${inputClass} text-center tracking-widest`}
                  style={inputStyle}
                />
              </Field>
              <Field label="New password">
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>
            </div>
            {error && (
              <p className="mt-3 text-xs" style={{ color: '#e53e3e' }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{ background: '#7c5cbf', color: 'white', fontFamily: 'var(--font-family-display)' }}
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
            <button
              type="button"
              onClick={() => setResetStep('request')}
              className="w-full mt-3 text-xs hover:opacity-80 transition-opacity"
              style={{ color: '#7c5cbf' }}
            >
              Use a different email
            </button>
          </form>
        )}

        {tab !== 'forgot' && (
          <p className="text-center text-xs mt-6" style={{ color: '#4a4a6a' }}>
            {tab === 'login' ? 'New to Helix? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
              className="font-medium hover:opacity-80 transition-opacity"
              style={{ color: '#7c5cbf' }}
            >
              {tab === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        )}
      </div>

      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
