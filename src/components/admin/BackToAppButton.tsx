import { Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import {
  CITIZEN_APP_EXTERNAL_URL,
  CITIZEN_APP_HOME,
  isCitizenAppExternal,
} from "@/config/appLinks";
import { cn } from "@/lib/utils";

type BackToAppButtonProps = {
  className?: string;
};

const buttonClassName = (className?: string) =>
  cn(
    "fixed bottom-6 left-4 z-40 inline-flex items-center gap-2 rounded-full",
    "border border-primary/20 bg-highlight px-4 py-2.5 text-sm font-semibold text-highlight-foreground shadow-lg",
    "transition-colors hover:bg-highlight/90 hover:shadow-xl",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    className,
  );

export function BackToAppButton({ className }: BackToAppButtonProps) {
  if (isCitizenAppExternal()) {
    return (
      <a
        href={CITIZEN_APP_EXTERNAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClassName(className)}
        aria-label="Voltar ao app Câmara na Mão (abre em nova aba)"
      >
        <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
        Voltar ao App
      </a>
    );
  }

  return (
    <Link
      to={CITIZEN_APP_HOME}
      className={buttonClassName(className)}
      aria-label="Voltar ao app Câmara na Mão"
    >
      <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
      Voltar ao App
    </Link>
  );
}
