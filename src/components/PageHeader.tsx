import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 md:mb-6 md:flex-row md:items-center">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold leading-tight text-slate-900 md:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}