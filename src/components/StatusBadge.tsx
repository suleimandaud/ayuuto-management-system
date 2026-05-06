const styles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-700',
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  unpaid: 'bg-red-50 text-red-700',
  partial: 'bg-orange-50 text-orange-700',
  late: 'bg-purple-50 text-purple-700',
  received: 'bg-emerald-50 text-emerald-700',
  corrected: 'bg-slate-100 text-slate-700',
  removed: 'bg-slate-100 text-slate-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
