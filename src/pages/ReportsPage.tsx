import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { money, dateOnly } from '../lib/format';
import { t, type Lang } from '../lib/i18n';

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) =>
    `"${String(value ?? '').replace(/"/g, '""')}"`;

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const lang: Lang = 'so';

  const [payments, setPayments] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [groupFilter, setGroupFilter] = useState('all');

  async function load() {
    const [paymentsRes, payoutsRes] = await Promise.all([
      supabase
        .from('payments')
        .select('*, member:group_members(*), round:rounds(*), group:ayuuto_groups(*)'),
      supabase
        .from('payouts')
        .select('*, receiver:group_members(*), round:rounds(*), group:ayuuto_groups(*)'),
    ]);

    if (paymentsRes.error) console.error(paymentsRes.error);
    if (payoutsRes.error) console.error(payoutsRes.error);

    setPayments(paymentsRes.data || []);
    setPayouts(payoutsRes.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, string>();

    payments.forEach((p) => p.group?.id && map.set(p.group.id, p.group.name));
    payouts.forEach((p) => p.group?.id && map.set(p.group.id, p.group.name));

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [payments, payouts]);

  const filteredPayments = payments.filter(
    (p) => groupFilter === 'all' || p.group?.id === groupFilter
  );

  const filteredPayouts = payouts.filter(
    (p) => groupFilter === 'all' || p.group?.id === groupFilter
  );

  const summary = useMemo(() => {
    const expected = filteredPayments.reduce(
      (s, p) => s + Number(p.amount_due || 0),
      0
    );

    const paid = filteredPayments.reduce(
      (s, p) => s + Number(p.amount_paid || 0),
      0
    );

    const unpaidCount = filteredPayments.filter((p) =>
      ['unpaid', 'partial'].includes(p.payment_status)
    ).length;

    return {
      expected,
      paid,
      missing: Math.max(expected - paid, 0),
      unpaidCount,
    };
  }, [filteredPayments]);

  function exportPaymentReport() {
    downloadCsv(
      'ayuuto-payment-report.csv',
      filteredPayments.map((p) => ({
        group: p.group?.name,
        round: p.round?.round_number,
        member: p.member?.full_name,
        phone: p.member?.phone,
        amount_due: p.amount_due,
        amount_paid: p.amount_paid,
        status: p.payment_status,
        method: p.payment_method,
        paid_date: p.paid_date,
        notes: p.notes,
      }))
    );
  }

  function exportPayoutReport() {
    downloadCsv(
      'ayuuto-payout-report.csv',
      filteredPayouts.map((p) => ({
        group: p.group?.name,
        round: p.round?.round_number,
        receiver: p.receiver?.full_name,
        phone: p.receiver?.phone,
        payout_amount: p.payout_amount,
        status: p.received_status,
        payout_date: p.payout_date,
        notes: p.notes,
      }))
    );
  }

  return (
    <div>
      <PageHeader
        title={t(lang, 'reports')}
        description={t(lang, 'reportsDescription')}
      />

      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
        >
          <option value="all">{t(lang, 'allGroups')}</option>

          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <button
          onClick={exportPaymentReport}
          className="rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-900"
        >
          {t(lang, 'exportPaymentsCsv')}
        </button>

        <button
          onClick={exportPayoutReport}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t(lang, 'exportPayoutsCsv')}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'expected')}</p>
          <p className="mt-2 text-xl font-bold">{money(summary.expected)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'paid')}</p>
          <p className="mt-2 text-xl font-bold">{money(summary.paid)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'missing')}</p>
          <p className="mt-2 text-xl font-bold">{money(summary.missing)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'unpaidRows')}</p>
          <p className="mt-2 text-xl font-bold">{summary.unpaidCount}</p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">
          {t(lang, 'unpaidMembersReport')}
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">{t(lang, 'memberName')}</th>
                <th>{t(lang, 'phone')}</th>
                <th>{t(lang, 'group')}</th>
                <th>{t(lang, 'roundNumber')}</th>
                <th>{t(lang, 'amountDue')}</th>
                <th>{t(lang, 'amountPaid')}</th>
                <th>{t(lang, 'status')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredPayments
                .filter((p) =>
                  ['unpaid', 'partial', 'late'].includes(p.payment_status)
                )
                .map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-medium text-slate-800">
                      {p.member?.full_name}
                    </td>

                    <td>{p.member?.phone}</td>
                    <td>{p.group?.name}</td>

                    <td>
                      {t(lang, 'roundNumber')} {p.round?.round_number}
                    </td>

                    <td>{money(p.amount_due)}</td>
                    <td>{money(p.amount_paid)}</td>

                    <td>
                      <StatusBadge status={p.payment_status} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">
          {t(lang, 'payoutReport')}
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">{t(lang, 'receiver')}</th>
                <th>{t(lang, 'group')}</th>
                <th>{t(lang, 'roundNumber')}</th>
                <th>{t(lang, 'amount')}</th>
                <th>{t(lang, 'status')}</th>
                <th>{t(lang, 'payoutDate')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredPayouts.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 font-medium text-slate-800">
                    {p.receiver?.full_name}
                  </td>

                  <td>{p.group?.name}</td>

                  <td>
                    {t(lang, 'roundNumber')} {p.round?.round_number}
                  </td>

                  <td>{money(p.payout_amount)}</td>

                  <td>
                    <StatusBadge status={p.received_status} />
                  </td>

                  <td>{dateOnly(p.payout_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}