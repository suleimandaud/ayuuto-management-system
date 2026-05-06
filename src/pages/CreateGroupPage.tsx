import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import type { GroupFrequency, GroupStatus } from '../lib/types';
import { t, type Lang } from '../lib/i18n';

export function CreateGroupPage() {
  const lang: Lang = 'so';

  const navigate = useNavigate();
  const { profile } = useAuth();

  const [form, setForm] = useState({
    name: '',
    amount_per_member: '',
    frequency: 'monthly' as GroupFrequency,
    custom_interval_days: '',
    start_date: new Date().toISOString().slice(0, 10),
    status: 'active' as GroupStatus,
  });

  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const payload = {
      name: form.name.trim(),
      amount_per_member: Number(form.amount_per_member),
      frequency: form.frequency,
      custom_interval_days:
        form.frequency === 'custom'
          ? Number(form.custom_interval_days || 30)
          : null,
      start_date: form.start_date,
      status: form.status,
      created_by: profile?.id,
    };

    const { data, error: insertError } = await supabase
      .from('ayuuto_groups')
      .insert(payload)
      .select('id')
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    navigate(`/admin/groups/${data.id}`);
  }

  return (
    <div>
      <PageHeader
        title={t(lang, 'createGroup')}
        description={t(lang, 'createGroupDescription')}
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              {t(lang, 'groupName')}
            </span>

            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>

          <label>
            <span className="text-sm font-medium text-slate-700">
              {t(lang, 'amountEachMemberPays')}
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
              value={form.amount_per_member}
              onChange={(e) =>
                setForm({ ...form, amount_per_member: e.target.value })
              }
              required
            />
          </label>

          <label>
            <span className="text-sm font-medium text-slate-700">
              {t(lang, 'paymentFrequency')}
            </span>

            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
              value={form.frequency}
              onChange={(e) =>
                setForm({
                  ...form,
                  frequency: e.target.value as GroupFrequency,
                })
              }
            >
              <option value="weekly">{t(lang, 'weekly')}</option>
              <option value="monthly">{t(lang, 'monthly')}</option>
              <option value="custom">{t(lang, 'custom')}</option>
            </select>
          </label>

          {form.frequency === 'custom' && (
            <label>
              <span className="text-sm font-medium text-slate-700">
                {t(lang, 'customIntervalDays')}
              </span>

              <input
                type="number"
                min="1"
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                value={form.custom_interval_days}
                onChange={(e) =>
                  setForm({ ...form, custom_interval_days: e.target.value })
                }
              />
            </label>
          )}

          <label>
            <span className="text-sm font-medium text-slate-700">
              {t(lang, 'startDate')}
            </span>

            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
              value={form.start_date}
              onChange={(e) =>
                setForm({ ...form, start_date: e.target.value })
              }
              required
            />
          </label>

          <label>
            <span className="text-sm font-medium text-slate-700">
              {t(lang, 'status')}
            </span>

            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as GroupStatus })
              }
            >
              <option value="active">{t(lang, 'active')}</option>
              <option value="completed">{t(lang, 'completed')}</option>
              <option value="cancelled">{t(lang, 'cancelled')}</option>
            </select>
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/groups')}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {t(lang, 'cancel')}
          </button>

          <button className="rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-900">
            {t(lang, 'createGroup')}
          </button>
        </div>
      </form>
    </div>
  );
}