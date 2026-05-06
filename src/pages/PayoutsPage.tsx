import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { money, dateOnly } from '../lib/format';
import type { PayoutStatus } from '../lib/types';
import { t, type Lang } from '../lib/i18n';

export function PayoutsPage() {
  const lang: Lang = 'so';

  const [payouts, setPayouts] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  async function load() {
    const { data, error } = await supabase
      .from('payouts')
      .select('*, receiver:group_members(*), round:rounds(*), group:ayuuto_groups(*)')
      .order('created_at', { ascending: false });

    if (error) console.error(error);

    setPayouts(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, received_status: PayoutStatus) {
    const patch: Record<string, unknown> = { received_status };

    if (received_status === 'received') {
      patch.payout_date = new Date().toISOString();
    }

    const { error } = await supabase
      .from('payouts')
      .update(patch)
      .eq('id', id);

    if (error) console.error(error);

    await load();
  }

  const filtered = useMemo(
    () =>
      payouts.filter((p) =>
        [
          p.receiver?.full_name,
          p.receiver?.phone,
          p.group?.name,
          String(p.round?.round_number),
        ]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [payouts, query]
  );

  return (
    <div>
      <PageHeader
        title={t(lang, 'payoutsReceivers')}
        description={t(lang, 'payoutsDescription')}
      />

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(lang, 'searchPayoutsPlaceholder')}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-3">{t(lang, 'receiver')}</th>
                <th>{t(lang, 'phone')}</th>
                <th>{t(lang, 'group')}</th>
                <th>{t(lang, 'roundNumber')}</th>
                <th>{t(lang, 'amount')}</th>
                <th>{t(lang, 'dueDate')}</th>
                <th>{t(lang, 'status')}</th>
                <th>{t(lang, 'payoutDate')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 font-medium text-slate-800">
                    {p.receiver?.full_name || '-'}
                  </td>

                  <td>{p.receiver?.phone || '-'}</td>
                  <td>{p.group?.name || '-'}</td>

                  <td>
                    {t(lang, 'roundNumber')} {p.round?.round_number || '-'}
                  </td>

                  <td>{money(p.payout_amount)}</td>
                  <td>{dateOnly(p.round?.due_date)}</td>

                  <td>
                    <select
                      value={p.received_status}
                      onChange={(e) =>
                        updateStatus(p.id, e.target.value as PayoutStatus)
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <option value="pending">{t(lang, 'pending')}</option>
                      <option value="received">{t(lang, 'received')}</option>
                      <option value="cancelled">{t(lang, 'cancelled')}</option>
                      <option value="corrected">{t(lang, 'corrected')}</option>
                    </select>
                  </td>

                  <td>{dateOnly(p.payout_date)}</td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    {t(lang, 'noPayoutsFound')}
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