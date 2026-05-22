import { cn } from '@/lib/utils';

export const adminGuideModalOverlayClass = cn(
  'fixed inset-0 z-50 bg-black/45 backdrop-blur-[3px]',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  'duration-300 ease-out',
);

export const adminGuideModalContentClass = cn(
  'fixed left-[50%] top-[50%] z-50 flex w-[calc(100%-1.5rem)] max-w-xl translate-x-[-50%] translate-y-[-50%] flex-col',
  'overflow-hidden rounded-xl border border-border/80 bg-background shadow-2xl sm:max-w-2xl',
  'outline-none',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
  'data-[state=closed]:slide-out-to-bottom-3 data-[state=open]:slide-in-from-bottom-4',
  'duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
  'max-h-[min(90dvh,40rem)]',
);
