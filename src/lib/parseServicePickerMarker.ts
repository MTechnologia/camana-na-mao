import { normalizeServiceTypeToDbEnum } from "@/lib/publicServiceType";

/**
 * Extrai :district, :type e :hideRatedToday de [SERVICE_PICKER:...].
 *
 * Os regex antigos em ChatMessageBubble falhavam: o padrão `\[SERVICE_PICKER[^\]]*:type=`
 * não encontrava nada porque `[^\]]*` (ganancioso) consumia todo o conteúdo até `]`,
 * incluindo `:district=...:type=...`, deixando serviceType/district sempre vazios e o
 * InlineServicePicker sem filtro (só campo de texto).
 */
export function parseServicePickerMarker(content: string): {
  serviceType?: string;
  district?: string;
  hideRatedToday?: boolean;
} {
  const bracket = content.match(/\[SERVICE_PICKER([^\]]*)\]/);
  if (!bracket) return {};

  const inner = bracket[1];
  const typeIdx = inner.indexOf(":type=");
  const distIdx = inner.indexOf(":district=");
  const hideIdx = inner.indexOf(":hideRatedToday=");

  const decode = (s: string): string | undefined => {
    const t = s.trim();
    if (!t) return undefined;
    try {
      return decodeURIComponent(t);
    } catch {
      return t;
    }
  };

  const endBeforeOptional = (fromIdx: number): number => {
    const rest = [distIdx, typeIdx, hideIdx].filter((i) => i > fromIdx);
    return rest.length ? Math.min(...rest) : inner.length;
  };

  let district: string | undefined;
  let serviceType: string | undefined;
  let hideRatedToday = false;

  if (distIdx >= 0) {
    const start = distIdx + ":district=".length;
    district = decode(inner.slice(start, endBeforeOptional(distIdx)));
  }

  if (typeIdx >= 0) {
    const start = typeIdx + ":type=".length;
    const rawType = decode(inner.slice(start, endBeforeOptional(typeIdx)));
    serviceType = normalizeServiceTypeToDbEnum(rawType) ?? rawType;
  }

  if (hideIdx >= 0) {
    const v = inner.slice(hideIdx + ":hideRatedToday=".length).trim();
    hideRatedToday = v === "1" || v.toLowerCase() === "true";
  }

  return { serviceType, district, hideRatedToday };
}
