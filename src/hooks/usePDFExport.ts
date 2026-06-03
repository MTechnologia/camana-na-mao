import { useCallback, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { formatShortDate, formatDateTime } from "@/lib/dateUtils";

interface PDFKPIData {
  label: string;
  value: string | number;
  trend?: { value: number; direction: "up" | "down" };
}

interface PDFCategoryData {
  name: string;
  count: number;
  percentage?: number;
}

interface PDFStatusData {
  pending: number;
  in_progress: number;
  resolved: number;
  rejected: number;
}

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  kpis?: PDFKPIData[];
  categories?: PDFCategoryData[];
  statusData?: PDFStatusData;
  sentimentScore?: number;
  chartElementId?: string;
  filters?: {
    dateRange?: { from?: string; to?: string };
    category?: string;
    status?: string;
    region?: string;
  };
  filename?: string;
}

export const usePDFExport = () => {
  const [exporting, setExporting] = useState(false);

  const exportToPDF = useCallback(async (options: PDFExportOptions) => {
    setExporting(true);

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // ===== HEADER =====
      // Título institucional
      pdf.setFontSize(22);
      pdf.setTextColor(139, 13, 28); // Cor institucional vermelho
      pdf.text("Câmara na Mão", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 8;

      // Subtítulo
      pdf.setFontSize(14);
      pdf.setTextColor(80, 80, 80);
      pdf.text(options.title, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 6;

      if (options.subtitle) {
        pdf.setFontSize(10);
        pdf.setTextColor(120, 120, 120);
        pdf.text(options.subtitle, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;
      }

      // Data de geração
      pdf.setFontSize(9);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Gerado em: ${formatDateTime(new Date())}`, pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 12;

      // Linha divisória
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // ===== KPIs =====
      if (options.kpis && options.kpis.length > 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(50, 50, 50);
        pdf.text("Indicadores Principais", margin, yPosition);
        yPosition += 8;

        const kpiWidth = (pageWidth - margin * 2 - 15) / 4; // 4 KPIs por linha
        const kpiHeight = 25;

        options.kpis.slice(0, 4).forEach((kpi, index) => {
          const xPos = margin + index * (kpiWidth + 5);

          // Box do KPI
          pdf.setFillColor(248, 248, 248);
          pdf.setDrawColor(220, 220, 220);
          pdf.roundedRect(xPos, yPosition, kpiWidth, kpiHeight, 2, 2, "FD");

          // Valor
          pdf.setFontSize(16);
          pdf.setTextColor(30, 30, 30);
          const valueStr =
            typeof kpi.value === "number" ? kpi.value.toLocaleString("pt-BR") : kpi.value;
          pdf.text(valueStr, xPos + kpiWidth / 2, yPosition + 10, { align: "center" });

          // Label
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(kpi.label, xPos + kpiWidth / 2, yPosition + 18, { align: "center" });

          // Trend (se existir)
          if (kpi.trend) {
            const trendColor = kpi.trend.direction === "up" ? [34, 197, 94] : [239, 68, 68];
            pdf.setTextColor(trendColor[0], trendColor[1], trendColor[2]);
            pdf.setFontSize(7);
            const arrow = kpi.trend.direction === "up" ? "↑" : "↓";
            pdf.text(`${arrow} ${kpi.trend.value}%`, xPos + kpiWidth / 2, yPosition + 22, {
              align: "center",
            });
          }
        });

        yPosition += kpiHeight + 12;
      }

      // ===== STATUS DISTRIBUTION =====
      if (options.statusData) {
        pdf.setFontSize(12);
        pdf.setTextColor(50, 50, 50);
        pdf.text("Distribuição por Status", margin, yPosition);
        yPosition += 8;

        const total =
          options.statusData.pending +
          options.statusData.in_progress +
          options.statusData.resolved +
          options.statusData.rejected;
        const statuses = [
          { label: "Pendente", value: options.statusData.pending, color: [234, 179, 8] },
          { label: "Em Andamento", value: options.statusData.in_progress, color: [59, 130, 246] },
          { label: "Resolvido", value: options.statusData.resolved, color: [34, 197, 94] },
          { label: "Rejeitado", value: options.statusData.rejected, color: [239, 68, 68] },
        ];

        statuses.forEach((status, index) => {
          const barWidth = total > 0 ? (status.value / total) * (pageWidth - margin * 2 - 80) : 0;
          const yBar = yPosition + index * 8;

          // Label
          pdf.setFontSize(9);
          pdf.setTextColor(80, 80, 80);
          pdf.text(status.label, margin, yBar + 4);

          // Bar background
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin + 45, yBar, pageWidth - margin * 2 - 80, 6, "F");

          // Bar filled
          pdf.setFillColor(status.color[0], status.color[1], status.color[2]);
          pdf.rect(margin + 45, yBar, barWidth, 6, "F");

          // Value
          pdf.setFontSize(9);
          pdf.setTextColor(50, 50, 50);
          const percentage = total > 0 ? ((status.value / total) * 100).toFixed(0) : 0;
          pdf.text(`${status.value} (${percentage}%)`, pageWidth - margin - 25, yBar + 4);
        });

        yPosition += 40;
      }

      // ===== CATEGORIES TABLE =====
      if (options.categories && options.categories.length > 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(50, 50, 50);
        pdf.text("Distribuição por Categoria", margin, yPosition);
        yPosition += 8;

        // Table header
        pdf.setFillColor(248, 248, 248);
        pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, "F");
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text("Categoria", margin + 3, yPosition + 5);
        pdf.text("Quantidade", pageWidth - margin - 50, yPosition + 5);
        pdf.text("%", pageWidth - margin - 15, yPosition + 5);
        yPosition += 10;

        const total = options.categories.reduce((sum, cat) => sum + cat.count, 0);

        options.categories.slice(0, 10).forEach((cat, index) => {
          const rowY = yPosition + index * 7;

          if (index % 2 === 1) {
            pdf.setFillColor(252, 252, 252);
            pdf.rect(margin, rowY - 2, pageWidth - margin * 2, 7, "F");
          }

          pdf.setFontSize(9);
          pdf.setTextColor(60, 60, 60);
          pdf.text(cat.name.slice(0, 30), margin + 3, rowY + 3);
          pdf.text(cat.count.toLocaleString("pt-BR"), pageWidth - margin - 50, rowY + 3);

          const percentage = total > 0 ? ((cat.count / total) * 100).toFixed(1) : "0";
          pdf.text(`${percentage}%`, pageWidth - margin - 15, rowY + 3);
        });

        yPosition += Math.min(options.categories.length, 10) * 7 + 10;
      }

      // ===== SENTIMENT SCORE =====
      if (options.sentimentScore !== undefined) {
        pdf.setFontSize(12);
        pdf.setTextColor(50, 50, 50);
        pdf.text("Índice de Satisfação", margin, yPosition);
        yPosition += 10;

        // Gauge visual simplificado
        const gaugeWidth = 80;
        const gaugeX = pageWidth / 2 - gaugeWidth / 2;

        pdf.setFillColor(240, 240, 240);
        pdf.rect(gaugeX, yPosition, gaugeWidth, 10, "F");

        const fillWidth = (options.sentimentScore / 100) * gaugeWidth;
        const color =
          options.sentimentScore >= 70
            ? [34, 197, 94]
            : options.sentimentScore >= 40
              ? [234, 179, 8]
              : [239, 68, 68];
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.rect(gaugeX, yPosition, fillWidth, 10, "F");

        pdf.setFontSize(14);
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(`${options.sentimentScore}%`, pageWidth / 2, yPosition + 20, { align: "center" });

        yPosition += 30;
      }

      // ===== CHART CAPTURE =====
      if (options.chartElementId) {
        const chartElement = document.getElementById(options.chartElementId);
        if (chartElement) {
          try {
            const canvas = await html2canvas(chartElement, {
              scale: 2,
              backgroundColor: "#ffffff",
              logging: false,
            });
            const imgData = canvas.toDataURL("image/png");

            const imgWidth = pageWidth - margin * 2;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Check if we need a new page
            if (yPosition + imgHeight > pageHeight - 30) {
              pdf.addPage();
              yPosition = margin;
            }

            pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, Math.min(imgHeight, 100));
            yPosition += Math.min(imgHeight, 100) + 10;
          } catch (error) {
            console.error("Error capturing chart:", error);
          }
        }
      }

      // ===== FOOTER =====
      // Filtros aplicados
      if (options.filters) {
        const footerY = pageHeight - 20;
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);

        const filterParts: string[] = [];
        if (options.filters.dateRange?.from || options.filters.dateRange?.to) {
          const from = options.filters.dateRange.from
            ? formatShortDate(new Date(options.filters.dateRange.from))
            : "-";
          const to = options.filters.dateRange.to
            ? formatShortDate(new Date(options.filters.dateRange.to))
            : "-";
          filterParts.push(`Período: ${from} a ${to}`);
        }
        if (options.filters.category && options.filters.category !== "all") {
          filterParts.push(`Categoria: ${options.filters.category}`);
        }
        if (options.filters.status && options.filters.status !== "all") {
          filterParts.push(`Status: ${options.filters.status}`);
        }
        if (options.filters.region && options.filters.region !== "all") {
          filterParts.push(`Região: ${options.filters.region}`);
        }

        if (filterParts.length > 0) {
          pdf.text(`Filtros: ${filterParts.join(" | ")}`, margin, footerY);
        }

        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

        pdf.text("Câmara Municipal de São Paulo - Câmara na Mão", pageWidth - margin, footerY, {
          align: "right",
        });
      }

      // Save PDF
      const filename =
        options.filename || `relatorio_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);

      return true;
    } catch (error) {
      console.error("PDF export error:", error);
      throw error;
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportToPDF, exporting };
};
