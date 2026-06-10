import type { FeatureCollection, Polygon, Point } from "geojson";
import { APP_CONFIG } from "../config";

// 配信データのスキーマ:
//   cell = [lon, lat, total, months[12], airspace[4], method[7], purpose[13], hokatsu]
export type Cell = [number, number, number, number[], number[], number[], number[], number];

export interface Meta {
  title: string;
  source: string;
  period: string;
  note: string;
  total_plans: number;
  cell_count: number;
  months: string[];
  airspace: string[];
  method: string[];
  purpose: string[];
  schema: string;
}

export interface MeshData {
  meta: Meta;
  cells: Cell[];
}

export const COL = {
  LON: 0,
  LAT: 1,
  TOTAL: 2,
  MONTHS: 3,
  AIR: 4,
  METHOD: 5,
  PURPOSE: 6,
  HOKATSU: 7,
} as const;

export type MeasureGroup = "total" | "month" | "airspace" | "method" | "purpose";

/** 選択中の指標から「セル → 件数」を取り出す関数を生成 */
export function buildMeasureFn(group: MeasureGroup, idx: number): (c: Cell) => number {
  switch (group) {
    case "month":
      return (c) => c[COL.MONTHS][idx] ?? 0;
    case "airspace":
      return (c) => c[COL.AIR][idx] ?? 0;
    case "method":
      return (c) => c[COL.METHOD][idx] ?? 0;
    case "purpose":
      return (c) => (idx < c[COL.PURPOSE].length ? c[COL.PURPOSE][idx] ?? 0 : c[COL.HOKATSU] ?? 0);
    default:
      return (c) => c[COL.TOTAL];
  }
}

export interface MeshResult {
  fc: FeatureCollection<Polygon, { v: number; t: number }>;
  maxV: number;
  sumV: number;
  cellCount: number;
}

/** 1km セルを指定解像度（km）の矩形メッシュへ再集計 */
export function computeMesh(
  cells: Cell[],
  cellSizeKm: number,
  measureFn: (c: Cell) => number,
): MeshResult {
  const empty: MeshResult = {
    fc: { type: "FeatureCollection", features: [] },
    maxV: 0,
    sumV: 0,
    cellCount: 0,
  };
  if (!cells.length) return empty;

  const centerLat = APP_CONFIG.initialView.center[1];
  const latStep = cellSizeKm / 111.0;
  const lonStep = cellSizeKm / (111.0 * Math.cos((centerLat * Math.PI) / 180));

  const bins = new Map<string, { v: number; t: number }>();
  for (const c of cells) {
    const v = measureFn(c);
    if (v <= 0) continue;
    const i = Math.floor(c[COL.LON] / lonStep);
    const j = Math.floor(c[COL.LAT] / latStep);
    const key = i + "_" + j;
    let bin = bins.get(key);
    if (!bin) {
      bin = { v: 0, t: 0 };
      bins.set(key, bin);
    }
    bin.v += v;
    bin.t += c[COL.TOTAL];
  }

  const features: MeshResult["fc"]["features"] = [];
  let maxV = 0;
  let sumV = 0;
  for (const [key, bin] of bins) {
    const [i, j] = key.split("_").map(Number);
    const w = i * lonStep;
    const e = w + lonStep;
    const s = j * latStep;
    const n = s + latStep;
    if (bin.v > maxV) maxV = bin.v;
    sumV += bin.v;
    features.push({
      type: "Feature",
      properties: { v: bin.v, t: bin.t },
      geometry: {
        type: "Polygon",
        coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
      },
    });
  }
  return { fc: { type: "FeatureCollection", features }, maxV, sumV, cellCount: features.length };
}

/** ヒートマップ用の点群（セル中心 + 重み） */
export function computePoints(
  cells: Cell[],
  measureFn: (c: Cell) => number,
): FeatureCollection<Point, { v: number }> {
  const features: Array<{
    type: "Feature";
    properties: { v: number };
    geometry: Point;
  }> = [];
  for (const c of cells) {
    const v = measureFn(c);
    if (v <= 0) continue;
    features.push({
      type: "Feature",
      properties: { v },
      geometry: { type: "Point", coordinates: [c[COL.LON], c[COL.LAT]] },
    });
  }
  return { type: "FeatureCollection", features };
}

/** fill-color 用の step 式 */
export function buildStepExpression(): unknown[] {
  const scale = APP_CONFIG.congestionScale;
  const expr: unknown[] = ["step", ["get", "v"], "rgba(0,0,0,0)"];
  for (const [threshold, color] of scale) expr.push(threshold, color);
  return expr;
}
