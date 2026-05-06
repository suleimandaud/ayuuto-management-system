import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { money, dateOnly } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { t, type Lang } from '../lib/i18n';

export function MemberDashboard() {
  const lang: Lang = 'so';

  const { profile } = useAuth();

  const [payments, setPayments] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);

  async function load() {
    const [memberRes, paymentsRes, payoutsRes] = await Promise.all([
      supabase
        .from('group_members')
        .select('*, group:ayuuto_groups(*)')
        .eq('profile_id', profile?.id),
      supabase
        .from('payments')
        .select('*, member:group_members(*), round:rounds(*), group:ayuuto_groups(*)')
        .order('created_at', { ascending: false }),
      supabase
        .from('payouts')
        .select('*, receiver:group_members(*), round:rounds(*), group:ayuuto_groups(*)')
        .order('created_at', { ascending: false }),
    ]);

    if (memberRes.error) console.error(memberRes.error);
    if (paymentsRes.error) console.error(paymentsRes.error);
    if (payoutsRes.error) console.error(payoutsRes.error);

    setMemberships(memberRes.data || []);
    setPayments(paymentsRes.data || []);
    setPayouts(payoutsRes.data || []);
  }

  useEffect(() => {
    if (profile?.id) load();
  }, [profile?.id]);

  const myStats = useMemo(() => {
    const due = payments.reduce((s, p) => s + Number(p.amount_due || 0), 0);
    const paid = payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0);
    const unpaid = payments.filter((p) =>
      ['unpaid', 'partial', 'late'].includes(p.payment_status)
    ).length;

    const nextPayout = payouts.find((p) => p.received_status === 'pending');

    return { due, paid, unpaid, nextPayout };
  }, [payments, payouts]);

  return (
    <div>
      <PageHeader
        title={t(lang, 'myAyuutoDashboard')}
        description={t(lang, 'memberDashboardDescription')}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'myGroups')}</p>
          <p className="mt-2 text-xl font-bold">{memberships.length}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'totalDue')}</p>
          <p className="mt-2 text-xl font-bold">{money(myStats.due)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'totalPaid')}</p>
          <p className="mt-2 text-xl font-bold">{money(myStats.paid)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'unpaidLate')}</p>
          <p className="mt-2 text-xl font-bold">{myStats.unpaid}</p>
        </div>
      </div>

      {myStats.nextPayout && (
        <section className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-5">
          <p className="text-sm font-medium text-brand-700">
            {t(lang, 'yourNextReceiverTurn')}
          </p>

          <h2 className="mt-1 text-xl font-bold text-brand-900">
            {myStats.nextPayout.group?.name} · {t(lang, 'roundNumber')}{' '}
            {myStats.nextPayout.round?.round_number}
          </h2>

          <p className="mt-1 text-sm text-brand-700">
            {t(lang, 'dueDate')}: {dateOnly(myStats.nextPayout.round?.due_date)} ·{' '}
            {t(lang, 'amount')}: {money(myStats.nextPayout.payout_amount)}
          </p>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">
          {t(lang, 'myPaymentHistory')}
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">{t(lang, 'group')}</th>
                <th>{t(lang, 'roundNumber')}</th>
                <th>{t(lang, 'amountDue')}</th>
                <th>{t(lang, 'amountPaid')}</th>
                <th>{t(lang, 'status')}</th>
                <th>{t(lang, 'paidDate')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 font-medium text-slate-800">
                    {p.group?.name}
                  </td>

                  <td>
                    {t(lang, 'roundNumber')} {p.round?.round_number}
                  </td>

                  <td>{money(p.amount_due)}</td>
                  <td>{money(p.amount_paid)}</td>

                  <td>
                    <StatusBadge status={p.payment_status} />
                  </td>

                  <td>{dateOnly(p.paid_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">
          {t(lang, 'receiverSchedule')}
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">{t(lang, 'group')}</th>
                <th>{t(lang, 'roundNumber')}</th>
                <th>{t(lang, 'receiver')}</th>
                <th>{t(lang, 'amount')}</th>
                <th>{t(lang, 'status')}</th>
                <th>{t(lang, 'dueDate')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 font-medium text-slate-800">
                    {p.group?.name}
                  </td>

                  <td>
                    {t(lang, 'roundNumber')} {p.round?.round_number}
                  </td>

                  <td>{p.receiver?.full_name}</td>
                  <td>{money(p.payout_amount)}</td>

                  <td>
                    <StatusBadge status={p.received_status} />
                  </td>

                  <td>{dateOnly(p.round?.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}