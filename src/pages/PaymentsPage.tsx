import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { money, dateOnly } from '../lib/format';
import type { PaymentStatus } from '../lib/types';
import { t, type Lang } from '../lib/i18n';

export function PaymentsPage() {
  const lang: Lang = 'so';

  const [payments, setPayments] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  async function load() {
    const { data, error } = await supabase
      .from('payments')
      .select('*, member:group_members(*), round:rounds(*), group:ayuuto_groups(*)')
      .order('created_at', { ascending: false });

    if (error) console.error(error);

    setPayments(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, payment_status: PaymentStatus) {
    const patch: Record<string, unknown> = { payment_status };

    if (['paid', 'partial', 'late'].includes(payment_status)) {
      patch.paid_date = new Date().toISOString();
    }

    const { error } = await supabase
      .from('payments')
      .update(patch)
      .eq('id', id);

    if (error) console.error(error);

    await load();
  }

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch = [
        p.member?.full_name,
        p.member?.phone,
        p.group?.name,
        String(p.round?.round_number),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query.toLowerCase());

      const matchesStatus = status === 'all' || p.payment_status === status;

      return matchesSearch && matchesStatus;
    });
  }, [payments, query, status]);

  return (
    <div>
      <PageHeader
        title={t(lang, 'payments')}
        description={t(lang, 'paymentsDescription')}
      />

      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(lang, 'searchPaymentsPlaceholder')}
          className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100 md:col-span-2"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
        >
          <option value="all">{t(lang, 'allStatuses')}</option>
          <option value="paid">{t(lang, 'paid')}</option>
          <option value="unpaid">{t(lang, 'unpaid')}</option>
          <option value="partial">{t(lang, 'partial')}</option>
          <option value="late">{t(lang, 'late')}</option>
          <option value="cancelled">{t(lang, 'cancelled')}</option>
          <option value="corrected">{t(lang, 'corrected')}</option>
        </select>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">{t(lang, 'memberName')}</th>
                <th>{t(lang, 'phone')}</th>
                <th>{t(lang, 'group')}</th>
                <th>{t(lang, 'roundNumber')}</th>
                <th>{t(lang, 'amountDue')}</th>
                <th>{t(lang, 'amountPaid')}</th>
                <th>{t(lang, 'status')}</th>
                <th>{t(lang, 'paidDate')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 font-medium text-slate-800">
                    {p.member?.full_name || '-'}
                  </td>

                  <td>{p.member?.phone || '-'}</td>
                  <td>{p.group?.name || '-'}</td>

                  <td>
                    {t(lang, 'roundNumber')} {p.round?.round_number || '-'}
                  </td>

                  <td>{money(p.amount_due)}</td>
                  <td>{money(p.amount_paid)}</td>

                  <td>
                    <select
                      value={p.payment_status}
                      onChange={(e) =>
                        updateStatus(p.id, e.target.value as PaymentStatus)
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <option value="unpaid">{t(lang, 'unpaid')}</option>
                      <option value="paid">{t(lang, 'paid')}</option>
                      <option value="partial">{t(lang, 'partial')}</option>
                      <option value="late">{t(lang, 'late')}</option>
                      <option value="cancelled">{t(lang, 'cancelled')}</option>
                      <option value="corrected">{t(lang, 'corrected')}</option>
                    </select>
                  </td>

                  <td>{dateOnly(p.paid_date)}</td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    {t(lang, 'noPaymentsFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}