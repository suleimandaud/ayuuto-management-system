import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { money, dateOnly } from '../lib/format';
import type { PaymentMethod, PaymentStatus, PayoutStatus } from '../lib/types';
import { t, type Lang } from '../lib/i18n';

export function RoundDetailsPage() {
  const lang: Lang = 'so';

  const { roundId } = useParams();

  const [round, setRound] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [payout, setPayout] = useState<any>(null);
  const [message, setMessage] = useState('');

  async function load() {
    if (!roundId) return;

    const [roundRes, paymentsRes, payoutRes] = await Promise.all([
      supabase
        .from('rounds')
        .select('*, group:ayuuto_groups(*), receiver:group_members(*)')
        .eq('id', roundId)
        .single(),
      supabase
        .from('payments')
        .select('*, member:group_members(*)')
        .eq('round_id', roundId)
        .order('created_at', { ascending: true }),
      supabase
        .from('payouts')
        .select('*, receiver:group_members(*)')
        .eq('round_id', roundId)
        .maybeSingle(),
    ]);

    if (roundRes.error) console.error(roundRes.error);
    if (paymentsRes.error) console.error(paymentsRes.error);
    if (payoutRes.error) console.error(payoutRes.error);

    setRound(roundRes.data);
    setPayments(paymentsRes.data || []);
    setPayout(payoutRes.data);
  }

  useEffect(() => {
    load();
  }, [roundId]);

  async function updatePayment(
    paymentId: string,
    patch: Record<string, unknown>
  ) {
    setMessage('');

    const { error } = await supabase
      .from('payments')
      .update(patch)
      .eq('id', paymentId);

    if (error) {
      setMessage(error.message);
      return;
    }

    await load();
  }

  async function updatePayout(patch: Record<string, unknown>) {
    if (!payout) return;

    setMessage('');

    const { error } = await supabase
      .from('payouts')
      .update(patch)
      .eq('id', payout.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await load();
  }

  const totals = useMemo(() => {
    const expected = payments.reduce(
      (s, p) => s + Number(p.amount_due || 0),
      0
    );

    const paid = payments.reduce(
      (s, p) => s + Number(p.amount_paid || 0),
      0
    );

    return {
      expected,
      paid,
      remaining: Math.max(expected - paid, 0),
    };
  }, [payments]);

  if (!round) {
    return <div className="text-slate-500">{t(lang, 'loadingRound')}</div>;
  }

  return (
    <div>
      <PageHeader
        title={`${round.group?.name || t(lang, 'group')} · ${t(
          lang,
          'roundNumber'
        )} ${round.round_number}`}
        description={`${t(lang, 'dueDate')}: ${dateOnly(
          round.due_date
        )} · ${t(lang, 'receiver')}: ${round.receiver?.full_name || '-'}`}
      />

      {message && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'expected')}</p>
          <p className="mt-2 text-2xl font-bold">{money(totals.expected)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'paid')}</p>
          <p className="mt-2 text-2xl font-bold">{money(totals.paid)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'remaining')}</p>
          <p className="mt-2 text-2xl font-bold">{money(totals.remaining)}</p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">
          {t(lang, 'paymentsForThisRound')}
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">{t(lang, 'memberName')}</th>
                <th>{t(lang, 'amountDue')}</th>
                <th>{t(lang, 'amountPaid')}</th>
                <th>{t(lang, 'status')}</th>
                <th>{t(lang, 'paymentMethod')}</th>
                <th>{t(lang, 'paidDate')}</th>
                <th>{t(lang, 'notes')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 font-medium text-slate-800">
                    {p.member?.full_name}
                  </td>

                  <td>{money(p.amount_due)}</td>

                  <td>
                    <input
                      type="number"
                      defaultValue={p.amount_paid}
                      className="w-28 rounded-lg border border-slate-200 px-3 py-2"
                      onBlur={(e) =>
                        updatePayment(p.id, {
                          amount_paid: Number(e.target.value),
                        })
                      }
                    />
                  </td>

                  <td>
                    <select
                      value={p.payment_status}
                      onChange={(e) =>
                        updatePayment(p.id, {
                          payment_status: e.target.value as PaymentStatus,
                          paid_date: ['paid', 'partial', 'late'].includes(
                            e.target.value
                          )
                            ? new Date().toISOString()
                            : p.paid_date,
                        })
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

                  <td>
                    <select
                      value={p.payment_method || ''}
                      onChange={(e) =>
                        updatePayment(p.id, {
                          payment_method: e.target.value as PaymentMethod,
                        })
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <option value="">-</option>
                      <option value="cash">{t(lang, 'cash')}</option>
                      <option value="bank">{t(lang, 'bank')}</option>
                      <option value="mobile_money">
                        {t(lang, 'mobileMoney')}
                      </option>
                      <option value="other">{t(lang, 'other')}</option>
                    </select>
                  </td>

                  <td>{dateOnly(p.paid_date)}</td>

                  <td>
                    <input
                      defaultValue={p.notes || ''}
                      placeholder={t(lang, 'correctionNote')}
                      className="w-48 rounded-lg border border-slate-200 px-3 py-2"
                      onBlur={(e) =>
                        updatePayment(p.id, { notes: e.target.value })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {payout && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="font-bold text-slate-900">
                {t(lang, 'payoutReceiver')}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {payout.receiver?.full_name} {t(lang, 'shouldReceive')}{' '}
                {money(payout.payout_amount)}
              </p>
            </div>

            <StatusBadge status={payout.received_status} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <select
              value={payout.received_status}
              onChange={(e) =>
                updatePayout({
                  received_status: e.target.value as PayoutStatus,
                  payout_date:
                    e.target.value === 'received'
                      ? new Date().toISOString()
                      : payout.payout_date,
                })
              }
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <option value="pending">{t(lang, 'pending')}</option>
              <option value="received">{t(lang, 'received')}</option>
              <option value="cancelled">{t(lang, 'cancelled')}</option>
              <option value="corrected">{t(lang, 'corrected')}</option>
            </select>

            <input
              type="number"
              defaultValue={payout.payout_amount}
              onBlur={(e) =>
                updatePayout({ payout_amount: Number(e.target.value) })
              }
              className="rounded-xl border border-slate-200 px-4 py-3"
            />

            <input
              defaultValue={payout.notes || ''}
              onBlur={(e) => updatePayout({ notes: e.target.value })}
              placeholder={t(lang, 'payoutNotes')}
              className="rounded-xl border border-slate-200 px-4 py-3"
            />
          </div>
        </section>
      )}
    </div>
  );
}