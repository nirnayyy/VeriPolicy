import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

const DATASET_DIR = path.resolve(process.cwd(), "Dataset");
const FILES = [
  "SIPRI-Milex-data-1949-2025_v1.2.xlsx",
  "owid-co2-data.xlsx",
];

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

function getColumnNames(rows: unknown[][]): string[] {
  if (!rows.length) {
    return [];
  }

  const firstRow = rows[0];
  const hasHeaders = firstRow.every((cell) => typeof cell === "string" && cell.trim().length > 0);

  if (hasHeaders) {
    return firstRow.map((cell, index) => formatValue(cell) || `Column ${index + 1}`);
  }

  return firstRow.map((_, index) => `Column ${index + 1}`);
}

function normalizeRow(row: unknown[], columns: string[]): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i += 1) {
    normalized[columns[i]] = i < row.length ? row[i] : null;
  }
  return normalized;
}

async function inspectFile(fileName: string): Promise<void> {
  const filePath = path.join(DATASET_DIR, fileName);

  const buffer = await fs.readFile(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  console.log("\n============================================");
  console.log(`File: ${fileName}`);
  console.log("============================================\n");

  console.log("Sheet names:", workbook.SheetNames.join(", "));

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      continue;
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: null,
      blankrows: false,
    });

    const columns = getColumnNames(rows);
    const hasHeaderRow = rows.length > 0 && rows[0].every((cell) => typeof cell === "string" && cell.trim().length > 0);
    const dataRows = hasHeaderRow ? rows.slice(1) : rows;
    const rowCount = dataRows.length;

    console.log("\n--------------------------------------------");
    console.log(`Sheet: ${sheetName}`);
    console.log("--------------------------------------------");
    console.log(`Column names (${columns.length}):`);
    console.log(columns.length ? columns.join(" | ") : "(no columns detected)");
    console.log(`Row count: ${rowCount}`);

    const sampleRows = dataRows.slice(0, 5).map((row) => normalizeRow(row, columns));
    if (sampleRows.length) {
      console.log("Sample first 5 rows:");
      sampleRows.forEach((row, index) => {
        console.log(`  [${index + 1}] ${JSON.stringify(row, null, 2)}`);
      });
    } else {
      console.log("Sample first 5 rows: (none)");
    }
  }
}

async function main(): Promise<void> {
  for (const fileName of FILES) {
    try {
      await inspectFile(fileName);
    } catch (error) {
      console.error(`Failed to inspect ${fileName}:`, error);
    }
  }
}

main().catch((error) => {
  console.error("Unexpected error during inspection:", error);
  process.exit(1);
});
