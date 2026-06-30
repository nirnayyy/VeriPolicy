import { getSupabase } from "../lib/supabase/client";
import type { HistoricalAnalogy } from "../lib/supabase/types";
import { existsSync, readFileSync } from "node:fs";

function loadLocalEnv(): void {
  console.log("DEBUG: process.cwd() is", process.cwd());
  for (const fileName of [".env.local", ".env"]) {
    const exists = existsSync(fileName);
    console.log(`DEBUG: Checking file ${fileName}: exists = ${exists}`);
    if (!exists) continue;

    const contents = readFileSync(fileName, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      const separatorIndex = trimmed.indexOf("=");
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
        console.log(`DEBUG: Loaded ${key} = ${value}`);
      }
    }
  }
}

// Load env variables before doing anything
loadLocalEnv();

type SeedResult = {
  inserted: number;
  skipped: number;
  insertedRows: HistoricalAnalogy[];
};

const ANALOGIES: Omit<HistoricalAnalogy, "id" | "created_at">[] = [
  {
    country: "United States",
    period: "2001-2008",
    defense_trend:
      "Defense spending rose approximately 80 percent following the September 11 attacks.",
    emissions_trend:
      "Industrial energy demand increased and emissions rose approximately 8 percent during the period.",
    industry_effect:
      "Defense manufacturing expanded significantly with increased procurement and military operations.",
    what_followed: "Sustained defense sector growth and increased industrial activity.",
  },
  {
    country: "Germany",
    period: "1990-1998",
    defense_trend:
      "Defense spending declined approximately 40 percent following reunification.",
    emissions_trend:
      "Emissions dropped sharply due to industrial restructuring in former East Germany.",
    industry_effect:
      "Heavy industry underwent significant modernization and consolidation.",
    what_followed: "Lower emissions and economic restructuring across eastern regions.",
  },
  {
    country: "India",
    period: "2010-2018",
    defense_trend:
      "Defense budget grew around 6 percent annually during modernization efforts.",
    emissions_trend:
      "National emissions increased approximately 40 percent due to industrial expansion.",
    industry_effect: "Manufacturing and infrastructure sectors expanded rapidly.",
    what_followed:
      "Increased industrial output and economic growth alongside higher emissions.",
  },
  {
    country: "United Kingdom",
    period: "2010-2015",
    defense_trend: "Defense spending was reduced under austerity measures.",
    emissions_trend:
      "Emissions declined approximately 15 percent while renewable energy adoption increased.",
    industry_effect: "Resources shifted toward clean energy and efficiency initiatives.",
    what_followed: "Lower carbon intensity and growth in renewable sectors.",
  },
  {
    country: "Saudi Arabia",
    period: "2016-2022",
    defense_trend:
      "Domestic defense spending increased while Vision 2030 reforms progressed.",
    emissions_trend: "Emissions growth slowed due to energy reform measures.",
    industry_effect: "Economic diversification initiatives expanded beyond oil dependence.",
    what_followed: "Mixed defense expansion with gradual energy transition policies.",
  },
  {
    country: "China",
    period: "2005-2015",
    defense_trend: "Defense spending more than doubled.",
    emissions_trend:
      "Emissions increased roughly 70 percent during heavy industrial expansion.",
    industry_effect: "Manufacturing capacity and export industries grew rapidly.",
    what_followed:
      "Large-scale economic growth accompanied by substantial emissions increases.",
  },
  {
    country: "Sweden",
    period: "2022-2025",
    defense_trend: "Defense spending increased toward NATO target levels.",
    emissions_trend:
      "Emissions remained relatively stable due to parallel green investment programs.",
    industry_effect:
      "Green steel initiatives and energy innovation continued alongside defense expansion.",
    what_followed: "Defense growth without major emissions acceleration.",
  },
  {
    country: "United States",
    period: "1991-1999",
    defense_trend:
      "Post-Cold War defense reductions occurred across multiple military programs.",
    emissions_trend: "Emissions remained comparatively stable.",
    industry_effect:
      "Military production slowed while technology sectors expanded.",
    what_followed: "Economic diversification and reduced defense dependency.",
  },
  {
    country: "France",
    period: "2000-2008",
    defense_trend: "Military personnel professionalization occurred and defense spending stabilized at 2.0% of GDP.",
    emissions_trend: "CO2 emissions declined 6% due to the expansion of nuclear energy generation.",
    industry_effect: "Aeronautics defense manufacturing (Dassault) experienced growth while industrial emissions fell.",
    what_followed: "Stable defense posture alongside clean decarbonization trajectory.",
  },
  {
    country: "Japan",
    period: "2012-2020",
    defense_trend: "Article 9 interpretation shifted and defense budget grew by 1.2% annually.",
    emissions_trend: "Fukushima nuclear shutdowns required coal and LNG import increases, raising CO2 emissions by 4%.",
    industry_effect: "Heavy defense industrial base expanded while green transition targets suffered setbacks.",
    what_followed: "Stronger defense capabilities with fossil fuel emissions growth.",
  },
  {
    country: "Russia",
    period: "2000-2008",
    defense_trend: "Defense spending increased 150% in real terms during military modernization.",
    emissions_trend: "Oil and gas industrial boom led to national emissions increasing by 22%.",
    industry_effect: "State-led defense conglomerates grew while fossil-fuel emissions expanded.",
    what_followed: "Substantial military buildup driven by hydrocarbon resource expansion.",
  },
  {
    country: "South Korea",
    period: "1998-2006",
    defense_trend: "Domestic weapons programs (KAI, Hanwha) expanded with 5% annual defense budget growth.",
    emissions_trend: "Industrial manufacturing and heavy shipbuilding led to emissions rising by 35%.",
    industry_effect: "Rapid manufacturing expansion in defense and technology sectors.",
    what_followed: "Sustained economic growth alongside elevated carbon output.",
  },
  {
    country: "Brazil",
    period: "2003-2010",
    defense_trend: "Defense partnerships (Gripen jets, Embraer) modernized forces with 4% annual budget growth.",
    emissions_trend: "Hydroelectric power dominance kept industrial manufacturing emissions stable.",
    industry_effect: "Aerospace defense sector expanded while energy emissions remained low.",
    what_followed: "Stable low-carbon footprint with increased industrial defense presence.",
  },
  {
    country: "United States",
    period: "1981-1988",
    defense_trend: "Reagan administration defense buildup raised spending from 5.2% to 6.2% of GDP.",
    emissions_trend: "National industrial carbon emissions increased 10% during manufacturing expansion.",
    industry_effect: "Aerospace and defense procurement experienced significant growth.",
    what_followed: "Major defense sector expansion alongside industrial carbon growth.",
  },
  {
    country: "South Africa",
    period: "1994-2000",
    defense_trend: "Post-apartheid transition reduced defense spending from 3.0% to 1.5% of GDP.",
    emissions_trend: "Coal-dependent power grid expansion led to industrial emissions rising by 12%.",
    industry_effect: "Defense production consolidated while public sector carbon footprint grew.",
    what_followed: "Reduced defense reliance with increased coal energy footprint.",
  },
  {
    country: "Germany",
    period: "2011-2018",
    defense_trend: "Defense spending remained low at 1.2% of GDP while forces faced operational constraints.",
    emissions_trend: "Energiewende nuclear phase-out required coal bridge use, stalling emissions decline at 2%.",
    industry_effect: "Defense production consolidated while coal reliance slowed carbon reduction.",
    what_followed: "Stagnated emissions targets alongside flat defense budgets.",
  },
  {
    country: "Italy",
    period: "2008-2015",
    defense_trend: "Post-financial crisis budget cuts reduced defense spending by 15%.",
    emissions_trend: "Industrial contraction and renewable feed-in tariffs decreased emissions by 20%.",
    industry_effect: "Heavy industrial manufacturing declined while clean energy market share grew.",
    what_followed: "De-industrialization and carbon reduction under fiscal austerity.",
  },
  {
    country: "China",
    period: "1990-2000",
    defense_trend: "Defense spending grew 10% annually during initial military modernization.",
    emissions_trend: "Rapid coal-fueled industrial expansion increased CO2 emissions by 65%.",
    industry_effect: "Manufacturing capacity and export industries grew exponentially.",
    what_followed: "Fast economic growth and carbon expansion.",
  },
  {
    country: "Canada",
    period: "2014-2022",
    defense_trend: "Arctic sovereignty initiatives grew defense spending by 4% annually.",
    emissions_trend: "Carbon pricing and coal phase-outs reduced industrial emissions by 5%.",
    industry_effect: "Clean technology sectors expanded while resources shifted away from fossil fuels.",
    what_followed: "Gradual decarbonization alongside sovereign defense upgrades.",
  },
  {
    country: "Australia",
    period: "2015-2023",
    defense_trend: "AUKUS planning and strategic review grew defense budget by 5% annually.",
    emissions_trend: "Coal plant retirements and solar expansion kept emissions stable.",
    industry_effect: "Defense aerospace and renewables both expanded simultaneously.",
    what_followed: "Defense modernization alongside flat carbon levels.",
  },
];

export async function seedHistoricalAnalogies(): Promise<SeedResult> {
  const supabase = getSupabase();
  const insertedRows: HistoricalAnalogy[] = [];
  let skipped = 0;

  for (const rec of ANALOGIES) {
    try {
      // Check for existing record by country + period
      const { data: existing, error: selectError } = await supabase
        .from("historical_analogies")
        .select("id")
        .eq("country", rec.country)
        .eq("period", rec.period)
        .limit(1);

      if (selectError) {
        throw selectError;
      }

      if (existing && (existing as any[]).length > 0) {
        skipped += 1;
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("historical_analogies")
        .insert(rec)
        .select()
        .single();

      if (insertError) throw insertError;

      insertedRows.push(inserted as HistoricalAnalogy);
    } catch (err: any) {
      // Throw with context so calling code can decide whether to continue
      throw new Error(`seedHistoricalAnalogies failed for ${rec.country} ${rec.period}: ${err.message || String(err)}`);
    }
  }

  return { inserted: insertedRows.length, skipped, insertedRows };
}

const executedDirectly = typeof process !== "undefined" && process.argv[1]?.includes("seedHistoricalAnalogies");

if (executedDirectly) {
  (async () => {
    try {
      const result = await seedHistoricalAnalogies();
      // eslint-disable-next-line no-console
      console.log("Seed completed:", JSON.stringify(result, null, 2));
      process.exit(0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Seed failed:", err);
      process.exit(1);
    }
  })();
}

export default seedHistoricalAnalogies;
