import type { ReactNode } from 'react';

type Props = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  helper?: string;
};

export function StatCard({ label, value, icon, helper }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
        </div>
        {icon && <div className="rounded-xl bg-brand-50 p-3 text-brand-700">{icon}</div>}
      </div>
    </div>
  );
}
