import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/Loading';
import { t, type Lang } from '../lib/i18n';

type AuthMode = 'login' | 'register';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function LoginPage() {
  const lang: Lang = 'so';

  const { profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loading />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile?.role === 'member') return <Navigate to="/member" replace />;

  async function loginWithEmail(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });

    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }

    await refreshProfile();

    const { data } = await supabase.from('profiles').select('role').single();

    navigate(data?.role === 'admin' ? '/admin' : '/member', { replace: true });

    setSubmitting(false);
  }

  async function registerWithEmail(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    const cleanEmail = normalizeEmail(email);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }

    if (!data.session) {
      setMessage(t(lang, 'accountCreatedCheckEmail'));
      setSubmitting(false);
      return;
    }

    await refreshProfile();

    await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        email: cleanEmail,
      })
      .eq('id', data.user?.id);

    navigate('/member', { replace: true });

    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-brand-700">
            {t(lang, 'ayuutoHagbad')}
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {mode === 'login'
              ? t(lang, 'loginWithEmail')
              : t(lang, 'createAccount')}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {t(lang, 'loginDescription')}
          </p>
        </div>

        <form
          onSubmit={mode === 'login' ? loginWithEmail : registerWithEmail}
          className="space-y-4"
        >
          {mode === 'register' && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                {t(lang, 'fullName')}
              </span>

              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t(lang, 'yourName')}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                required
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              {t(lang, 'email')}
            </span>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              {t(lang, 'password')}
            </span>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(lang, 'enterPassword')}
              minLength={6}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
              required
            />
          </label>

          <button
            disabled={submitting}
            className="w-full rounded-xl bg-brand-700 px-4 py-3 font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
          >
            {submitting
              ? t(lang, 'pleaseWait')
              : mode === 'login'
                ? t(lang, 'login')
                : t(lang, 'createAccount')}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setMessage('');
          }}
          className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-600 hover:bg-slate-50"
        >
          {mode === 'login'
            ? t(lang, 'iDoNotHaveAccount')
            : t(lang, 'iAlreadyHaveAccount')}
        </button>

        {message && (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}