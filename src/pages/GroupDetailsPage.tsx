import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { money, dateOnly } from '../lib/format';
import type { AyuutoGroup, GroupMember, Round } from '../lib/types';
import { t, type Lang } from '../lib/i18n';

export function GroupDetailsPage() {
  const lang: Lang = 'so';

  const { groupId } = useParams();
  const [group, setGroup] = useState<AyuutoGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [rounds, setRounds] = useState<any[]>([]);
  const [memberForm, setMemberForm] = useState({ full_name: '', phone: '' });
  const [message, setMessage] = useState('');

  async function load() {
    if (!groupId) return;

    const [groupRes, membersRes, roundsRes] = await Promise.all([
      supabase.from('ayuuto_groups').select('*').eq('id', groupId).single(),
      supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('rounds')
        .select('*, receiver:group_members(*)')
        .eq('group_id', groupId)
        .order('round_number', { ascending: true }),
    ]);

    if (groupRes.error) console.error(groupRes.error);
    if (membersRes.error) console.error(membersRes.error);
    if (roundsRes.error) console.error(roundsRes.error);

    setGroup(groupRes.data as AyuutoGroup);
    setMembers((membersRes.data || []) as GroupMember[]);
    setRounds((roundsRes.data || []) as Round[]);
  }

  useEffect(() => {
    load();
  }, [groupId]);

  async function addMember(e: FormEvent) {
    e.preventDefault();

    if (!groupId) return;

    setMessage('');

    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      full_name: memberForm.full_name.trim(),
      phone: memberForm.phone.trim(),
      status: 'active',
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMemberForm({ full_name: '', phone: '' });

    await load();
  }

  async function generateRounds() {
    if (!groupId) return;

    setMessage(t(lang, 'generatingRounds'));

    const { error } = await supabase.rpc('generate_group_rounds', {
      p_group_id: groupId,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(t(lang, 'roundsGeneratedSuccessfully'));

    await load();
  }

  const totals = useMemo(
    () => ({
      activeMembers: members.filter((m) => m.status === 'active').length,
      expectedPerRound:
        members.filter((m) => m.status === 'active').length *
        Number(group?.amount_per_member || 0),
    }),
    [members, group]
  );

  if (!group) {
    return <div className="text-slate-500">{t(lang, 'loadingGroup')}</div>;
  }

  return (
    <div>
      <PageHeader
        title={group.name}
        description={`${t(lang, 'amountPerMember')}: ${money(
          group.amount_per_member
        )} · ${t(lang, 'frequency')}: ${t(lang, group.frequency)}`}
        action={
          <button
            onClick={generateRounds}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-900"
          >
            <RefreshCcw size={18} />
            {t(lang, 'generateRounds')}
          </button>
        }
      />

      {message && (
        <p className="mb-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
          {message}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'groupStatus')}</p>
          <div className="mt-3">
            <StatusBadge status={group.status} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t(lang, 'activeMembers')}</p>
          <p className="mt-2 text-2xl font-bold">{totals.activeMembers}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            {t(lang, 'expectedPerRound')}
          </p>
          <p className="mt-2 text-2xl font-bold">
            {money(totals.expectedPerRound)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h2 className="font-bold text-slate-900">{t(lang, 'addMember')}</h2>

          <form onSubmit={addMember} className="mt-4 space-y-3">
            <input
              value={memberForm.full_name}
              onChange={(e) =>
                setMemberForm({ ...memberForm, full_name: e.target.value })
              }
              placeholder={t(lang, 'fullName')}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
              required
            />

            <input
              value={memberForm.phone}
              onChange={(e) =>
                setMemberForm({ ...memberForm, phone: e.target.value })
              }
              placeholder="+25261xxxxxxx"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
              required
            />

            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-900">
              <Plus size={18} />
              {t(lang, 'addMember')}
            </button>
          </form>

          <h2 className="mt-6 font-bold text-slate-900">
            {t(lang, 'members')}
          </h2>

          <div className="mt-3 space-y-2">
            {members.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {m.full_name}
                    </p>
                    <p className="text-sm text-slate-500">{m.phone}</p>
                  </div>

                  <StatusBadge status={m.status} />
                </div>
              </div>
            ))}

            {members.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-400">
                {t(lang, 'noMembersFound')}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="font-bold text-slate-900">{t(lang, 'rounds')}</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3">{t(lang, 'roundNumber')}</th>
                  <th>{t(lang, 'dueDate')}</th>
                  <th>{t(lang, 'receiver')}</th>
                  <th>{t(lang, 'expected')}</th>
                  <th>{t(lang, 'paid')}</th>
                  <th>{t(lang, 'status')}</th>
                  <th></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rounds.map((round) => (
                  <tr key={round.id}>
                    <td className="py-3 font-medium">
                      {t(lang, 'roundNumber')} {round.round_number}
                    </td>

                    <td>{dateOnly(round.due_date)}</td>
                    <td>{round.receiver?.full_name || '-'}</td>
                    <td>{money(round.expected_total)}</td>
                    <td>{money(round.paid_total)}</td>

                    <td>
                      <StatusBadge status={round.status} />
                    </td>

                    <td>
                      <Link
                        className="text-sm font-semibold text-brand-700"
                        to={`/admin/rounds/${round.id}`}
                      >
                        {t(lang, 'open')}
                      </Link>
                    </td>
                  </tr>
                ))}

                {rounds.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      {t(lang, 'noRoundsYet')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}