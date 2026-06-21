export type AnalyticsRow = {
  country: string;
  year: number;
  militaryExpenditure: number | null;
  co2: number | null;
};

let cachedData: AnalyticsRow[] | null = null;

async function loadData(): Promise<AnalyticsRow[]> {
  if (cachedData) return cachedData;

  const resp = await fetch('/analytics-data.json');
  if (!resp.ok) throw new Error(`Failed to load analytics-data.json: ${resp.status} ${resp.statusText}`);
  const json = (await resp.json()) as AnalyticsRow[];
  cachedData = json;
  return cachedData;
}

export async function getCountryAnalytics(country: string) {
  const data = await loadData();
  return data.filter((r) => r.country === country).sort((a, b) => a.year - b.year);
}

export async function getCountriesAnalytics(countries: string[]) {
  const data = await loadData();
  const set = new Set(countries.map((c) => c.trim()));
  const filtered = data.filter((r) => set.has(r.country)).sort((a, b) => a.country.localeCompare(b.country) || a.year - b.year);

  const grouped = new Map<string, AnalyticsRow[]>();
  for (const row of filtered) {
    const arr = grouped.get(row.country) ?? [];
    arr.push(row);
    grouped.set(row.country, arr);
  }
  return grouped;
}

export async function getAllAnalytics() {
  return await loadData();
}

export default { getCountryAnalytics, getCountriesAnalytics, getAllAnalytics };
