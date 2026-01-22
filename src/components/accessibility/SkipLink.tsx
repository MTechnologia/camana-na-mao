import { cn } from "@/lib/utils";

interface SkipLinkProps {
  targetId?: string;
  className?: string;
}

/**
 * Skip Link component for WCAG 2.4.1 compliance
 * Allows keyboard users to bypass navigation and jump to main content
 */
const SkipLink = ({ targetId = "main-content", className }: SkipLinkProps) => {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only",
        "focus:absolute focus:top-2 focus:left-2 focus:z-[9999]",
        "focus:px-4 focus:py-2 focus:rounded-md",
        "focus:bg-primary focus:text-primary-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "font-medium text-sm transition-all",
        className
      )}
    >
      Pular para o conteúdo principal
    </a>
  );
};

export default SkipLink;
