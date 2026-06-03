import { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRangeValue } from "@/components/filters/types";
import type { AgendaItem } from "@/hooks/useAgenda";
import { getEventTypeConfig } from "@/hooks/useAgenda";

type AgendaPdfFilters = {
  dateRange?: DateRangeValue;
  type?: string; // 'all' | AgendaItem['eventType']
  search?: string;
};

function safeText(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateBr(dateIso: string) {
  try {
    return format(parseISO(dateIso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateIso;
  }
}

function formatLongDateBr(dateIso: string) {
  try {
    return format(parseISO(dateIso), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return dateIso;
  }
}

export function downloadAgendaPdf(args: {
  title?: string;
  items: AgendaItem[];
  filters?: AgendaPdfFilters;
  filename?: string;
}) {
  const title = args.title ?? "Agenda da Câmara Municipal";
  const items = [...args.items].sort((a, b) => {
    const dateCmp = a.eventDate.localeCompare(b.eventDate);
    if (dateCmp !== 0) return dateCmp;
    return (a.eventTime || "").localeCompare(b.eventTime || "");
  });

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ===== Header =====
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(139, 13, 28);
  pdf.text("Câmara na Mão", pageWidth / 2, y, { align: "center" });
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(60, 60, 60);
  pdf.text(title, pageWidth / 2, y, { align: "center" });
  y += 6;

  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
    pageWidth / 2,
    y,
    {
      align: "center",
    },
  );
  y += 8;

  // Filters line
  const filterParts: string[] = [];
  const dr = args.filters?.dateRange;
  if (dr?.from || dr?.to) {
    const from = dr.from ? format(dr.from, "dd/MM/yyyy", { locale: ptBR }) : "-";
    const to = dr.to ? format(dr.to, "dd/MM/yyyy", { locale: ptBR }) : "-";
    filterParts.push(`Período: ${from} até ${to}`);
  }
  if (args.filters?.type && args.filters.type !== "all") {
    filterParts.push(`Tipo: ${safeText(args.filters.type)}`);
  }
  if (args.filters?.search) {
    filterParts.push(`Busca: ${safeText(args.filters.search)}`);
  }

  if (filterParts.length > 0) {
    pdf.setFontSize(8);
    pdf.setTextColor(140, 140, 140);
    const line = `Filtros: ${filterParts.join(" | ")}`;
    pdf.text(pdf.splitTextToSize(line, contentWidth), margin, y);
    y += 8;
  }

  pdf.setDrawColor(210, 210, 210);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ===== Body =====
  if (items.length === 0) {
    pdf.setFontSize(11);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Nenhum evento encontrado para os filtros selecionados.", margin, y);
  } else {
    pdf.setFontSize(10);
    pdf.setTextColor(50, 50, 50);

    for (const item of items) {
      const typeLabel = getEventTypeConfig(item.eventType).label;
      const titleLine = safeText(item.title);
      const locationLine = safeText(item.location);
      const timeLine = item.eventTime ? ` • ${safeText(item.eventTime)}` : "";
      const headerLine = `${formatDateBr(item.eventDate)}${timeLine} • ${typeLabel}`;

      // Page break (block height ~ 22-30mm depending on wrapping)
      if (y > pageHeight - margin - 28) {
        pdf.addPage();
        y = margin;
      }

      // Header (date/type)
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(110, 110, 110);
      pdf.text(headerLine, margin, y);
      y += 5;

      // Title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(30, 30, 30);
      const titleWrapped = pdf.splitTextToSize(titleLine, contentWidth);
      pdf.text(titleWrapped, margin, y);
      y += titleWrapped.length * 5;

      // Location
      if (locationLine) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(pdf.splitTextToSize(`Local: ${locationLine}`, contentWidth), margin, y);
        y += 5;
      }

      // Description (optional, trimmed)
      const desc = safeText(item.description);
      if (desc) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(110, 110, 110);
        const trimmed = desc.length > 260 ? `${desc.slice(0, 260)}…` : desc;
        const descWrapped = pdf.splitTextToSize(trimmed, contentWidth);
        pdf.text(descWrapped, margin, y);
        y += Math.min(descWrapped.length, 3) * 4.2;
      }

      // Divider
      y += 3;
      pdf.setDrawColor(235, 235, 235);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;
    }
  }

  // Footer - source
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text("Fonte: Portal da Câmara Municipal de São Paulo", margin, pageHeight - 10);

  const filename =
    args.filename ?? `agenda_cmsp_${format(new Date(), "yyyy-MM-dd", { locale: ptBR })}.pdf`;
  pdf.save(filename);
}

export function buildAgendaPdfSubtitle(dateIso: string) {
  return formatLongDateBr(dateIso);
}
