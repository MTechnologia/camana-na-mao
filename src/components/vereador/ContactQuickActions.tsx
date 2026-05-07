import { Map as MapIcon, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * HU-1.6 — Atalhos de contato para uso em campo (mobile-first).
 *
 * Renderiza botões touch-friendly que disparam:
 *   - tel: para ligar direto
 *   - mailto: para abrir cliente de email
 *   - https://maps.google.com/?q=... para abrir o app de mapas
 *
 * Esconde o botão quando o respectivo dado não está disponível, evitando
 * placeholders mortos no card.
 */

interface ContactQuickActionsProps {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  className?: string;
  size?: "sm" | "md";
}

function clean(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : null;
}

export function ContactQuickActions({
  phone,
  email,
  address,
  className,
  size = "md",
}: ContactQuickActionsProps) {
  const phoneClean = clean(phone)?.replace(/[^\d+]/g, "");
  const emailClean = clean(email);
  const addressClean = clean(address);

  if (!phoneClean && !emailClean && !addressClean) return null;

  const buttonSize = size === "sm" ? "sm" : "default";
  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {phoneClean && (
        <Button
          asChild
          variant="outline"
          size={buttonSize}
          className="min-h-[44px] gap-2"
          aria-label="Ligar para o cidadão"
        >
          <a href={`tel:${phoneClean}`}>
            <Phone className={iconClass} aria-hidden="true" />
            <span>Ligar</span>
          </a>
        </Button>
      )}

      {emailClean && (
        <Button
          asChild
          variant="outline"
          size={buttonSize}
          className="min-h-[44px] gap-2"
          aria-label="Enviar email"
        >
          <a href={`mailto:${emailClean}`}>
            <Mail className={iconClass} aria-hidden="true" />
            <span>Email</span>
          </a>
        </Button>
      )}

      {addressClean && (
        <Button
          asChild
          variant="outline"
          size={buttonSize}
          className="min-h-[44px] gap-2"
          aria-label="Abrir endereço no mapa"
        >
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressClean)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapIcon className={iconClass} aria-hidden="true" />
            <span>Mapa</span>
          </a>
        </Button>
      )}
    </div>
  );
}
