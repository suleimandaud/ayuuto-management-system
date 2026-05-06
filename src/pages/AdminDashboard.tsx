import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CircleDollarSign, Layers, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { money, dateOnly } from '../lib/format';
import { t, type Lang } from '../lib/i18n';

type DashboardData = {
  groups: any[];
  rounds: any[];
  payments: any[];
  payouts: any[];
};

export function AdminDashboard() {
  // For now, Somali is fixed here.
  // Later we can make this dynamic using localStorage or a language switcher.
  const lang: Lang = 'so';

  const [data, setData] = useState<DashboardData>({
    groups: [],
    rounds: [],
    payments: [],
    payouts: [],
  });

  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const [groupsRes, roundsRes, paymentsRes, payoutsRes] = await Promise.all([
      supabase
        .from('ayuuto_groups')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('rounds')
        .select('*, receiver:group_members(*)')
        .order('due_date', { ascending: true }),

      supabase
        .from('payments')
        .select('*, member:group_members(*), round:rounds(*)'),

      supabase
        .from('payouts')
        .select('*, receiver:group_members(*), round:rounds(*)')
        .order('created_at', { ascending: false }),
    ]);

    if (groupsRes.error) console.error(groupsRes.error);
    if (roundsRes.error) console.error(roundsRes.error);
    if (paymentsRes.error) console.error(paymentsRes.error);
    if (payoutsRes.error) console.error(payoutsRes.error);

    setData({
      groups: groupsRes.data || [],
      rounds: roundsRes.data || [],
      payments: paymentsRes.data || [],
      payouts: payoutsRes.data || [],
    });

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const activeGroups = data.groups.filter((g) => g.status === 'active');
    const activeRound = data.rounds.find((r) => r.status === 'active') || data.rounds[0];

    const expected = data.rounds.reduce(
      (sum, r) => sum + Number(r.expected_total || 0),
      0
    );

    const paid = data.payments.reduce(
      (sum, p) => sum + Number(p.amount_paid || 0),
      0
    );

    const unpaid = data.payments.filter(
      (p) => p.payment_status === 'unpaid' || p.payment_status === 'partial'
    );

    return {
      totalGroups: data.groups.length,
      activeGroups: activeGroups.length,
      activeRound,
      expected,
      paid,
      missing: Math.max(expected - paid, 0),
      unpaid,
    };
  }, [data]);

  return (
    <div>
      <PageHeader
        title={t(lang, 'adminDashboard')}
        description={t(lang, 'dashboardDescription')}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t(lang, 'totalGroups')}
          value={stats.totalGroups}
          icon={<Layers size={22} />}
        />

        <StatCard
          label={t(lang, 'activeGroups')}
          value={stats.activeGroups}
          icon={<Users size={22} />}
        />

        <StatCard
          label={t(lang, 'totalExpectedMoney')}
          value={money(stats.expected)}
          icon={<CircleDollarSign size={22} />}
        />

        <StatCard
          label={t(lang, 'missingAmount')}
          value={money(stats.missing)}
          icon={<CalendarClock size={22} />}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">
              {t(lang, 'unpaidMembers')}
            </h2>

            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
              {stats.unpaid.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3">{t(lang, 'memberName')}</th>
                  <th>{t(lang, 'phone')}</th>
                  <th>{t(lang, 'rounds')}</th>
                  <th>{t(lang, 'amountDue')}</th>
                  <th>{t(lang, 'amountPaid')}</th>
                  <th>{t(lang, 'status')}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {stats.unpaid.slice(0, 10).map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-medium text-slate-800">
                      {p.member?.full_name || '-'}
                    </td>

                    <td>{p.member?.phone || '-'}</td>

                    <td>
                      {t(lang, 'roundNumber')} {p.round?.round_number || '-'}
                    </td>

                    <td>{money(p.amount_due)}</td>
                    <td>{money(p.amount_paid)}</td>

                    <td>
                      <StatusBadge status={p.payment_status} />
                    </td>
                  </tr>
                ))}

                {!loading && stats.unpaid.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                 
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">
            {t(lang, 'upcomingReceivers')}
          </h2>

          <div className="mt-4 space-y-3">
            {data.payouts.slice(0, 7).map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {p.receiver?.full_name || '-'}
                    </p>

                    <p className="text-sm text-slate-500">
                      {t(lang, 'roundNumber')} {p.round?.round_number || '-'} ·{' '}
                      {dateOnly(p.round?.due_date)}
                    </p>
                  </div>

                  <StatusBadge status={p.received_status} />
                </div>

                <p className="mt-2 text-sm font-medium text-brand-700">
                  {money(p.payout_amount)}
                </p>
              </div>
            ))}

            {!loading && data.payouts.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-400">
                {t(lang, 'noPayoutsFound')}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}