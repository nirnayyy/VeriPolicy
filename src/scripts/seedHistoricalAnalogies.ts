import { getSupabase } from "../lib/supabase/client";
import type { HistoricalAnalogy } from "../lib/supabase/types";

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

// If run directly via ts-node or compiled and executed, run the seeder
if (require.main === module) {
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
