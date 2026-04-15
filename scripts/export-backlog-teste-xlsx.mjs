/**
 * Gera docs/BACKLOG_TESTE_ROTAS.xlsx a partir de docs/BACKLOG_TESTE_ROTAS.csv
 * Uso: node scripts/export-backlog-teste-xlsx.mjs
 */
import ExcelJS from "exceljs";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const csvPath = join(root, "docs", "BACKLOG_TESTE_ROTAS.csv");
const outPath = join(root, "docs", "BACKLOG_TESTE_ROTAS.xlsx");

const raw = readFileSync(csvPath, "utf8");
const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);

const workbook = new ExcelJS.Workbook();
workbook.creator = "Câmara na Mão";
workbook.created = new Date();

const sheet = workbook.addWorksheet("Rotas — teste", {
  views: [{ state: "frozen", ySplit: 1 }],
  properties: { defaultRowHeight: 20 },
});

const borderThin = {
  top: { style: "thin", color: { argb: "FFCCCCCC" } },
  left: { style: "thin", color: { argb: "FFCCCCCC" } },
  bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
  right: { style: "thin", color: { argb: "FFCCCCCC" } },
};

lines.forEach((line, rowIndex) => {
  const cells = line.split(",");
  while (cells.length < 6) cells.push("");
  const row = sheet.addRow(cells.slice(0, 6));
  const isHeader = rowIndex === 0;
  const zebra = rowIndex > 0 && rowIndex % 2 === 0;

  row.height = isHeader ? 24 : undefined;

  row.eachCell((cell, colNumber) => {
    cell.border = borderThin;
    cell.alignment = {
      vertical: "middle",
      wrapText: true,
      horizontal: colNumber === 5 ? "center" : "left",
    };

    if (isHeader) {
      cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A5F" },
      };
    } else {
      cell.font = { size: 11 };
      if (zebra) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7F8FA" },
        };
      }
    }
  });
});

sheet.columns = [
  { width: 26 },
  { width: 38 },
  { width: 20 },
  { width: 54 },
  { width: 12 },
  { width: 32 },
];

sheet.autoFilter = {
  from: { row: 1, column: 1 },
  to: { row: lines.length, column: 6 },
};

await workbook.xlsx.writeFile(outPath);
console.log("Gerado:", outPath);
