export function Loading({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
      {label}
    </div>
  );
}
