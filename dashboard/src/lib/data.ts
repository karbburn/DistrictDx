// ── District Data Types & Loaders ─────────────────────────────────────────────
// Central data module for the DistrictDx dashboard.
// All data is static (pre-computed CSV/TopoJSON committed to repo).

import type { FeatureCollection, Geometry } from "geojson";
import * as topojson from "topojson-client";
import type { Topology, GeometryObject } from "topojson-specification";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DistrictData {
  lgd_state_code: number;
  lgd_district_code: number;
  district_name: string;
  state_name: string;

  // Axis scores
  Demand_Chronic: number;
  Demand_Acute: number;
  Realizability_Chronic: number;
  Realizability_Acute: number;
  Demand_Overall: number;
  Realizability_Overall: number;

  // Composite indices
  MAI_Overall: number;
  MAI_Chronic: number;
  MAI_Acute: number;

  // Quadrant assignments (within-state median split)
  quadrant_overall: string;
  quadrant_chronic: string;
  quadrant_acute: string;

  // Data reliability
  confidence_score: number;
  boundary_inherited: boolean;

  // Historical (for trend computation)
  MAI_Overall_hist: number;
  MAI_Chronic_hist: number;
  MAI_Acute_hist: number;

  // Trend slopes
  slope_overall: number;
  slope_chronic: number;
  slope_acute: number;

  // Future projections (β = 0.3 default)
  Future_MAI_Overall: number;
  Future_MAI_Chronic: number;
  Future_MAI_Acute: number;

  // Future axis scores
  Future_Demand_Overall: number;
  Future_Realizability_Overall: number;
  Future_Demand_Chronic: number;
  Future_Realizability_Chronic: number;
  Future_Demand_Acute: number;
  Future_Realizability_Acute: number;

  // Future quadrants
  quadrant_overall_future: string;
  quadrant_chronic_future: string;
  quadrant_acute_future: string;

  // Raw indicators (selection for drill-down display)
  census_total_population: number;
  literacy_rate: number;
  sex_ratio: number;
  nightlight_log_mean: number;
  nightlight_growth_rate: number;
}

export type IndexType = "overall" | "chronic" | "acute";
export type TimeHorizon = "current" | "future";
export type ConfidenceLevel = "high" | "medium" | "low";
export type QuadrantKey = "Star" | "Emerging" | "Underserved" | "Deprioritize";

export interface GeoDistrictProperties {
  lgd_state_code: number;
  lgd_district_code: number;
  district_name: string;
  state_name: string;
}

// ── Caches ────────────────────────────────────────────────────────────────────

let _districtDataCache: DistrictData[] | null = null;
let _geoCache: FeatureCollection<Geometry, GeoDistrictProperties> | null = null;
let _districtByLgdCache: Map<number, DistrictData> | null = null;

// ── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSVRow(headers: string[], row: string): Record<string, string> {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current);

  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = values[i] ?? "";
  });
  return obj;
}

function toNumber(val: string): number {
  if (val === "" || val === "nan" || val === "NaN" || val === "None") return NaN;
  const n = Number(val);
  return isNaN(n) ? NaN : n;
}

// ── Data Loaders ──────────────────────────────────────────────────────────────

export async function loadDistrictData(): Promise<DistrictData[]> {
  if (_districtDataCache) return _districtDataCache;

  const resp = await fetch("/data/district_index_final.csv");
  if (!resp.ok) throw new Error(`Failed to fetch district data: ${resp.status}`);
  const text = await resp.text();
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const headers = lines[0].replace(/\r$/, "").split(",");

  const data: DistrictData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = parseCSVRow(headers, lines[i].replace(/\r$/, ""));
    data.push({
      lgd_state_code: toNumber(raw["lgd_state_code"]),
      lgd_district_code: toNumber(raw["lgd_district_code"]),
      district_name: raw["district_name"] || "",
      state_name: raw["state_name"] || "",

      Demand_Chronic: toNumber(raw["Demand_Chronic"]),
      Demand_Acute: toNumber(raw["Demand_Acute"]),
      Realizability_Chronic: toNumber(raw["Realizability_Chronic"]),
      Realizability_Acute: toNumber(raw["Realizability_Acute"]),
      Demand_Overall: toNumber(raw["Demand_Overall"]),
      Realizability_Overall: toNumber(raw["Realizability_Overall"]),

      MAI_Overall: toNumber(raw["MAI_Overall"]),
      MAI_Chronic: toNumber(raw["MAI_Chronic"]),
      MAI_Acute: toNumber(raw["MAI_Acute"]),

      quadrant_overall: raw["quadrant_overall"] || "",
      quadrant_chronic: raw["quadrant_chronic"] || "",
      quadrant_acute: raw["quadrant_acute"] || "",

      confidence_score: toNumber(raw["confidence_score"]),
      boundary_inherited: raw["boundary_inherited"] === "True" || raw["boundary_inherited"] === "true" || raw["boundary_inherited"] === "1",

      MAI_Overall_hist: toNumber(raw["MAI_Overall_hist"]),
      MAI_Chronic_hist: toNumber(raw["MAI_Chronic_hist"]),
      MAI_Acute_hist: toNumber(raw["MAI_Acute_hist"]),

      slope_overall: toNumber(raw["slope_overall"]),
      slope_chronic: toNumber(raw["slope_chronic"]),
      slope_acute: toNumber(raw["slope_acute"]),

      Future_MAI_Overall: toNumber(raw["Future_MAI_Overall"]),
      Future_MAI_Chronic: toNumber(raw["Future_MAI_Chronic"]),
      Future_MAI_Acute: toNumber(raw["Future_MAI_Acute"]),

      Future_Demand_Overall: toNumber(raw["Future_Demand_Overall"]),
      Future_Realizability_Overall: toNumber(raw["Future_Realizability_Overall"]),
      Future_Demand_Chronic: toNumber(raw["Future_Demand_Chronic"]),
      Future_Realizability_Chronic: toNumber(raw["Future_Realizability_Chronic"]),
      Future_Demand_Acute: toNumber(raw["Future_Demand_Acute"]),
      Future_Realizability_Acute: toNumber(raw["Future_Realizability_Acute"]),

      quadrant_overall_future: raw["quadrant_overall_future"] || "",
      quadrant_chronic_future: raw["quadrant_chronic_future"] || "",
      quadrant_acute_future: raw["quadrant_acute_future"] || "",

      census_total_population: toNumber(raw["census_total_population"]),
      literacy_rate: toNumber(raw["literacy_rate"]),
      sex_ratio: toNumber(raw["sex_ratio"]),
      nightlight_log_mean: toNumber(raw["nightlight_log_mean"]),
      nightlight_growth_rate: toNumber(raw["nightlight_growth_rate"]),
    });
  }

  _districtDataCache = data;
  _districtByLgdCache = new Map(data.map((d) => [d.lgd_district_code, d]));
  return data;
}

export async function loadGeoData(): Promise<
  FeatureCollection<Geometry, GeoDistrictProperties>
> {
  if (_geoCache) return _geoCache;

  const resp = await fetch("/data/india-districts-topo.json");
  if (!resp.ok) throw new Error(`Failed to fetch geo data: ${resp.status}`);
  const topo = (await resp.json()) as Topology;

  // Convert TopoJSON → GeoJSON FeatureCollection (785 districts)
  const objectKey = Object.keys(topo.objects)[0];
  const geo = topojson.feature(
    topo,
    topo.objects[objectKey] as GeometryObject<GeoDistrictProperties>
  ) as unknown as FeatureCollection<Geometry, GeoDistrictProperties>;

  _geoCache = geo;
  return geo;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getDistrictByLgd(
  _data: DistrictData[],
  lgdCode: number
): DistrictData | undefined {
  return _districtByLgdCache?.get(lgdCode);
}

export function getStateList(data: DistrictData[]): string[] {
  const states = new Set(data.map((d) => d.state_name));
  return [...states].sort();
}

export function getMAIValue(
  district: DistrictData,
  indexType: IndexType,
  timeHorizon: TimeHorizon
): number {
  if (timeHorizon === "future") {
    switch (indexType) {
      case "overall":
        return district.Future_MAI_Overall;
      case "chronic":
        return district.Future_MAI_Chronic;
      case "acute":
        return district.Future_MAI_Acute;
    }
  }
  switch (indexType) {
    case "overall":
      return district.MAI_Overall;
    case "chronic":
      return district.MAI_Chronic;
    case "acute":
      return district.MAI_Acute;
  }
}

export function getDemandValue(
  district: DistrictData,
  indexType: IndexType,
  timeHorizon: TimeHorizon
): number {
  if (timeHorizon === "future") {
    switch (indexType) {
      case "overall":
        return district.Future_Demand_Overall;
      case "chronic":
        return district.Future_Demand_Chronic;
      case "acute":
        return district.Future_Demand_Acute;
    }
  }
  switch (indexType) {
    case "overall":
      return district.Demand_Overall;
    case "chronic":
      return district.Demand_Chronic;
    case "acute":
      return district.Demand_Acute;
  }
}

export function getRealizabilityValue(
  district: DistrictData,
  indexType: IndexType,
  timeHorizon: TimeHorizon
): number {
  if (timeHorizon === "future") {
    switch (indexType) {
      case "overall":
        return district.Future_Realizability_Overall;
      case "chronic":
        return district.Future_Realizability_Chronic;
      case "acute":
        return district.Future_Realizability_Acute;
    }
  }
  switch (indexType) {
    case "overall":
      return district.Realizability_Overall;
    case "chronic":
      return district.Realizability_Chronic;
    case "acute":
      return district.Realizability_Acute;
  }
}

export function getQuadrant(
  district: DistrictData,
  indexType: IndexType,
  timeHorizon: TimeHorizon
): string {
  if (timeHorizon === "future") {
    switch (indexType) {
      case "overall":
        return district.quadrant_overall_future;
      case "chronic":
        return district.quadrant_chronic_future;
      case "acute":
        return district.quadrant_acute_future;
    }
  }
  switch (indexType) {
    case "overall":
      return district.quadrant_overall;
    case "chronic":
      return district.quadrant_chronic;
    case "acute":
      return district.quadrant_acute;
  }
}

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

export function getQuadrantLabel(quadrant: string): {
  label: string;
  description: string;
} {
  switch (quadrant) {
    case "Star":
      return {
        label: "Star Market",
        description: "High demand + strong infrastructure. Core priority.",
      };
    case "Emerging":
      return {
        label: "Emerging Opportunity",
        description:
          "High demand but limited infrastructure. Investment needed.",
      };
    case "Underserved":
      return {
        label: "Underserved",
        description: "Low demand but strong access. Niche opportunity.",
      };
    case "Deprioritize":
      return {
        label: "Deprioritize",
        description: "Low demand + limited infrastructure. Monitor only.",
      };
    default:
      return { label: quadrant, description: "" };
  }
}
