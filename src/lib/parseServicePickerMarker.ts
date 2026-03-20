import { normalizeServiceTypeToDbEnum } from "@/lib/publicServiceType";

/**
 * Extrai :district e :type de [SERVICE_PICKER:district=X:type=Y].
 *
 * Os regex antigos em ChatMessageBubble falhavam: o padrão `\[SERVICE_PICKER[^\]]*:type=`
 * não encontrava nada porque `[^\]]*` (ganancioso) consumia todo o conteúdo até `]`,
 * incluindo `:district=...:type=...`, deixando serviceType/district sempre vazios e o
 * InlineServicePicker sem filtro (só campo de texto).
 */
export function parseServicePickerMarker(content: string): {
  serviceType?: string;
  district?: string;
} {
  const bracket = content.match(/\[SERVICE_PICKER([^\]]*)\]/);
  if (!bracket) return {};

  const inner = bracket[1];
  const typeIdx = inner.indexOf(":type=");
  const distIdx = inner.indexOf(":district=");

  const decode = (s: string): string | undefined => {
    const t = s.trim();
    if (!t) return undefined;
    try {
      return decodeURIComponent(t);
    } catch {
      return t;
    }
  };

  let district: string | undefined;
  let serviceType: string | undefined;

  if (distIdx >= 0) {
    const start = distIdx + ":district=".length;
    const end = typeIdx > distIdx ? typeIdx : inner.length;
    district = decode(inner.slice(start, end));
  }

  if (typeIdx >= 0) {
    const rawType = decode(inner.slice(typeIdx + ":type=".length));
    serviceType = normalizeServiceTypeToDbEnum(rawType) ?? rawType;
  }

  return { serviceType, district };
}
