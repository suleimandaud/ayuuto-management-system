import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { money, dateOnly } from '../lib/format';
import type { AyuutoGroup } from '../lib/types';
import { t, type Lang } from '../lib/i18n';

export function GroupsPage() {
  const lang: Lang = 'so';

  const [groups, setGroups] = useState<AyuutoGroup[]>([]);
  const [search, setSearch] = useState('');

  async function load() {
    const { data, error } = await supabase
      .from('ayuuto_groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error(error);

    setGroups((data || []) as AyuutoGroup[]);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title={t(lang, 'ayuutoGroups')}
        description={t(lang, 'groupsDescription')}
        action={
          <Link
            to="/admin/groups/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-900"
          >
            <Plus size={18} />
            {t(lang, 'createGroup')}
          </Link>
        }
      />

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(lang, 'searchByGroupName')}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((group) => (
          <Link
            key={group.id}
            to={`/admin/groups/${group.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {group.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {t(lang, 'started')} {dateOnly(group.start_date)}
                </p>
              </div>

              <StatusBadge status={group.status} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-400">
                  {t(lang, 'amountPerMember')}
                </p>

                <p className="font-semibold text-slate-800">
                  {money(group.amount_per_member)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-400">{t(lang, 'frequency')}</p>

                <p className="font-semibold capitalize text-slate-800">
                  {t(lang, group.frequency)}
                </p>
              </div>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm md:col-span-2 xl:col-span-3">
            {t(lang, 'noGroupsFound')}
          </div>
        )}
      </div>
    </div>
  );
}