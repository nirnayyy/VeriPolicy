import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";

type AnalyticsRow = {
  country: string;
  year: number;
  militaryExpenditure: number | null;
  co2: number | null;
};

const TARGET_COUNTRIES = [
  "United States",
  "Germany",
  "India",
  "China",
  "United Kingdom",
  "Saudi Arabia",
  "Sweden",
] as const;

const TARGET_COUNTRY_MAP = new Map<string, string>([
  ["united states of america", "United States"],
  ["united states", "United States"],
  ["usa", "United States"],
  ["us", "United States"],
  ["germany", "Germany"],
  ["india", "India"],
  ["china", "China"],
  ["united kingdom", "United Kingdom"],
  ["uk", "United Kingdom"],
  ["saudi arabia", "Saudi Arabia"],
  ["sweden", "Sweden"],
]);

const DATASET_DIR = path.resolve(process.cwd(), "Dataset");
const OUTPUT_FILE = path.resolve(process.cwd(), "public", "analytics-data.json");

function normalizeKey(key: unknown): string {
  return String(key ?? "").trim().toLowerCase();
}

function normalizeCountry(raw: unknown): string | null {
  if (raw == null) {
    return null;
  }

  const country = String(raw).trim();
  const normalized = normalizeKey(country);

  if (TARGET_COUNTRIES.some((target) => normalizeKey(target) === normalized)) {
    return TARGET_COUNTRIES.find((target) => normalizeKey(target) === normalized) ?? null;
  }

  return TARGET_COUNTRY_MAP.get(normalized) ?? null;
}

function parseNumber(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value).trim().replace(/,/g, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function findBestKey(headers: string[], candidates: string[]): string | null {
  const keys = headers.map((header) => header.toLowerCase());
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    const match = keys.find((key) => key.includes(lower));
    if (match) {
      return headers[keys.indexOf(match)];
    }
  }
  return null;
}

function normalizeYear(value: unknown): number | null {
  const maybe = parseNumber(value);
  if (maybe == null) {
    return null;
  }
  return Number.isFinite(maybe) ? Math.trunc(maybe) : null;
}

async function loadOwidCo2Data(): Promise<Array<{ country: string; year: number; co2: number | null }>> {
  const xlsxPath = path.join(DATASET_DIR, "owid-co2-data.xlsx");
  const csvPath = path.join(DATASET_DIR, "owid-co2-data.csv");

  if (await exists(xlsxPath)) {
    return loadOwidFromXlsx(xlsxPath);
  }

  if (await exists(csvPath)) {
    return loadOwidFromCsv(csvPath);
  }

  throw new Error(`Missing OWID dataset. Expected ${xlsxPath} or ${csvPath}.`);
}

async function loadOwidFromCsv(filePath: string): Promise<Array<{ country: string; year: number; co2: number | null }>> {
  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }

  const header = parseCsvLine(lines[0]);
  const countryKey = findBestKey(header, ["country"]);
  const yearKey = findBestKey(header, ["year"]);
  const co2Key = findBestKey(header, ["co2", "co2 emissions"]);

  if (!countryKey || !yearKey || !co2Key) {
    throw new Error(`OWID CSV header did not contain expected columns: ${header.join(", ")}`);
  }

  const countryIndex = header.indexOf(countryKey);
  const yearIndex = header.indexOf(yearKey);
  const co2Index = header.indexOf(co2Key);

  const rows: Array<{ country: string; year: number; co2: number | null }> = [];

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const cells = parseCsvLine(lines[rowIndex]);
    const country = normalizeCountry(cells[countryIndex]);
    const year = normalizeYear(cells[yearIndex]);
    if (!country || year === null) {
      continue;
    }

    const co2 = parseNumber(cells[co2Index]);
    if (!TARGET_COUNTRIES.includes(country)) {
      continue;
    }

    rows.push({ country, year, co2 });
  }

  console.log(`OWID CO2 rows loaded: ${lines.length - 1}, target country rows: ${rows.length}`);
  return rows;
}

async function loadOwidFromXlsx(filePath: string): Promise<Array<{ country: string; year: number; co2: number | null }>> {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const rows: Array<{ country: string; year: number; co2: number | null }> = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      continue;
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: null,
      blankrows: false,
    });

    if (!rawRows.length) {
      continue;
    }

    const headers = Object.keys(rawRows[0]);
    const countryKey = findBestKey(headers, ["country"]);
    const yearKey = findBestKey(headers, ["year"]);
    const co2Key = findBestKey(headers, ["co2", "co2 emissions"]);

    if (!countryKey || !yearKey || !co2Key) {
      continue;
    }

    for (const rawRow of rawRows) {
      const country = normalizeCountry(rawRow[countryKey]);
      const year = normalizeYear(rawRow[yearKey]);
      if (!country || year === null) {
        continue;
      }
      if (!TARGET_COUNTRIES.includes(country)) {
        continue;
      }
      rows.push({ country, year, co2: parseNumber(rawRow[co2Key]) });
    }
  }

  console.log(`OWID CO2 rows loaded from XLSX: ${rows.length}`);
  return rows;
}

async function loadSipriMilitaryData(): Promise<Array<{ country: string; year: number; militaryExpenditure: number | null }>> {
  const filePath = path.join(DATASET_DIR, "SIPRI-Milex-data-1949-2025_v1.2.xlsx");
  if (!(await exists(filePath))) {
    throw new Error(`Missing SIPRI dataset at ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const worksheet = workbook.Sheets["Constant (2024) US$"];
  if (!worksheet) {
    throw new Error(`Expected SIPRI sheet "Constant (2024) US$" not found in ${filePath}`);
  }

  const rows: Array<{ country: string; year: number; militaryExpenditure: number | null }> = [];

  const rawRows = XLSX.utils.sheet_to_json<unknown[][]>(worksheet, {
    defval: null,
    blankrows: false,
    header: 1,
  });

  if (!rawRows.length) {
    return rows;
  }

  const headerRowIndex = rawRows.findIndex(
    (row) => Array.isArray(row) && normalizeKey(row[0]) === "country",
  );

  if (headerRowIndex === -1) {
    return rows;
  }

  const headerRow = rawRows[headerRowIndex] as unknown[];
  const headers = headerRow.map((value) => String(value ?? "").trim());
  const countryIndex = headers.findIndex((header) => normalizeKey(header) === "country");

  if (countryIndex === -1) {
    return rows;
  }

  const yearColumns = headers
    .map((header, index) => ({ index, year: normalizeYear(header) }))
    .filter((item) => item.year !== null) as Array<{ index: number; year: number }>;

  if (!yearColumns.length) {
    return rows;
  }

  for (let rowIndex = headerRowIndex + 1; rowIndex < rawRows.length; rowIndex += 1) {
    const rawRow = rawRows[rowIndex];
    if (!Array.isArray(rawRow)) {
      continue;
    }

    const country = normalizeCountry(rawRow[countryIndex]);
    if (!country || !TARGET_COUNTRIES.includes(country)) {
      continue;
    }

    for (const { index, year } of yearColumns) {
      const value = rawRow[index];
      const militaryExpenditure = parseNumber(value);
      rows.push({ country, year, militaryExpenditure });
    }
  }

  console.log(`SIPRI military expenditure rows loaded: ${rows.length}`);
  return rows;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function buildAnalyticsDataset(): Promise<void> {
  const co2Rows = await loadOwidCo2Data();
  const sipriRows = await loadSipriMilitaryData();

  const co2Index = new Map<string, number | null>();
  for (const row of co2Rows) {
    co2Index.set(`${row.country}::${row.year}`, row.co2);
  }

  const militaryIndex = new Map<string, number | null>();
  for (const row of sipriRows) {
    militaryIndex.set(`${row.country}::${row.year}`, row.militaryExpenditure);
  }

  const mergedMap = new Map<string, AnalyticsRow>();

  const addRow = (country: string, year: number, militaryExpenditure: number | null, co2: number | null) => {
    const key = `${country}::${year}`;
    const existing = mergedMap.get(key);
    if (existing) {
      mergedMap.set(key, {
        country,
        year,
        militaryExpenditure: militaryExpenditure ?? existing.militaryExpenditure,
        co2: co2 ?? existing.co2,
      });
    } else {
      mergedMap.set(key, { country, year, militaryExpenditure, co2 });
    }
  };

  for (const country of TARGET_COUNTRIES) {
    const years = new Set<number>();

    for (const row of co2Rows) {
      if (row.country !== country) continue;
      years.add(row.year);
    }

    for (const row of sipriRows) {
      if (row.country !== country) continue;
      years.add(row.year);
    }

    for (const year of years) {
      addRow(country, year, militaryIndex.get(`${country}::${year}`) ?? null, co2Index.get(`${country}::${year}`) ?? null);
    }
  }

  const analytics = Array.from(mergedMap.values()).sort((a, b) => {
    if (a.country !== b.country) {
      return a.country.localeCompare(b.country);
    }
    return a.year - b.year;
  });

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(analytics, null, 2), "utf8");

  console.log(`Written ${analytics.length} merged rows to ${OUTPUT_FILE}`);
  console.log(`Target countries: ${TARGET_COUNTRIES.join(", ")}`);
}

buildAnalyticsDataset().catch((error) => {
  console.error("Failed to build analytics dataset:", error);
  process.exit(1);
});
