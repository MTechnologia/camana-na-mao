import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { HelpCircle, X } from 'lucide-react';
import { ParameterLegendContent } from '@/components/admin/analytics/ParameterLegend';
import {
  adminGuideModalContentClass,
  adminGuideModalOverlayClass,
} from '@/components/admin/guide/adminGuideModalStyles';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';
import { cn } from '@/lib/utils';

type PageUsageGuideFooterProps = {
  items: ParameterLegendItem[];
  /** Nome da tela exibido no cabeçalho do modal. */
  pageName?: string;
  /** Conteúdo opcional da aba de homologação (regras RN, etc.). */
  homologationItems?: ParameterLegendItem[];
  children?: ReactNode;
  className?: string;
};

export function PageUsageGuideFooter({
  items,
  pageName,
  homologationItems,
  children,
  className,
}: PageUsageGuideFooterProps) {
  const hasUsage = items.length > 0;
  const hasHomologation = (homologationItems?.length ?? 0) > 0;
  if (!hasUsage && !hasHomologation) return children ? <>{children}</> : null;

  const showTabs = hasUsage && hasHomologation;

  return (
    <section
      className={cn('space-y-4', className)}
      aria-label="Ajuda e navegação complementar"
    >
      {children}

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <DialogPrimitive.Root>
          <DialogPrimitive.Trigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'h-auto min-h-[52px] w-full gap-2 rounded-xl border-dashed px-4 py-3 sm:max-w-sm',
                'shadow-sm transition-colors hover:border-primary/35 hover:bg-accent/50',
              )}
            >
              <HelpCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="text-sm font-medium">Como usar esta tela</span>
            </Button>
          </DialogPrimitive.Trigger>

          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className={adminGuideModalOverlayClass} />
            <DialogPrimitive.Content className={adminGuideModalContentClass}>
              <div className="relative shrink-0 border-b border-border/80 bg-muted/30 px-5 py-4 pr-12 sm:px-6">
                <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-foreground">
                  Como usar esta tela
                </DialogPrimitive.Title>
                {pageName ? (
                  <DialogPrimitive.Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {pageName}
                  </DialogPrimitive.Description>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scroll-smooth sm:px-6 sm:py-6">
                {showTabs ? (
                  <Tabs defaultValue="uso">
                    <TabsList className="mb-4 h-9 w-full justify-start sm:w-auto">
                      <TabsTrigger value="uso" className="text-xs sm:text-sm">
                        Uso da tela
                      </TabsTrigger>
                      <TabsTrigger value="homologacao" className="text-xs sm:text-sm">
                        Para homologação
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="uso" className="mt-0">
                      <ParameterLegendContent items={items} density="modal" />
                    </TabsContent>
                    <TabsContent value="homologacao" className="mt-0">
                      <ParameterLegendContent
                        items={homologationItems ?? []}
                        density="modal"
                      />
                    </TabsContent>
                  </Tabs>
                ) : hasHomologation ? (
                  <ParameterLegendContent items={homologationItems ?? []} density="modal" />
                ) : (
                  <ParameterLegendContent items={items} density="modal" />
                )}
              </div>

              <DialogPrimitive.Close
                className={cn(
                  'absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full',
                  'text-muted-foreground transition-all duration-200',
                  'hover:bg-muted hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </section>
  );
}
