import type { ReactNode } from 'react';

type GovernancePageHeaderProps = {
  title: string;
  actions?: ReactNode;
};

export function GovernancePageHeader({ title, actions }: GovernancePageHeaderProps) {
  return (
    <header className="border-b border-border pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Câmara na Mão · Administração e conformidade
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
            {title}
          </h1>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-1">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
