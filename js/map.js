/* global maplibregl, APP_CONFIG, I18N, LABELS_EN */
"use strict";

// ---------------------------------------------------------------------------
// 0. 多言語
// ---------------------------------------------------------------------------
let LANG = (function () {
  try {
    const saved = localStorage.getItem("uav-lang");
    if (saved === "ja" || saved === "en") return saved;
  } catch (e) { /* ignore */ }
  return "ja";
})();

function t(key) {
  return (I18N[LANG] && I18N[LANG][key]) || (I18N.ja && I18N.ja[key]) || key;
}

// 日本語の正規化済みラベルを現在言語へ
function labelFor(jaLabel) {
  if (LANG === "en") return LABELS_EN[jaLabel] || jaLabel;
  return jaLabel;
}

// "202407" → 言語別の月表記
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthLabel(yyyymm) {
  const y = yyyymm.slice(0, 4);
  const m = parseInt(yyyymm.slice(4, 6), 10);
  return LANG === "en" ? `${EN_MONTHS[m - 1]} ${y}` : `${y}年${m}月`;
}

// ---------------------------------------------------------------------------
// 1. 地図スタイルの構築（地理院地図の各タイルをソース／レイヤーとして定義）
// ---------------------------------------------------------------------------
function buildStyle() {
  const sources = {};
  const layers = [];
  for (const [key, b] of Object.entries(APP_CONFIG.basemaps)) {
    sources["basemap-" + key] = {
      type: "raster",
      tiles: b.tiles,
      tileSize: 256,
      maxzoom: b.maxzoom,
      attribution: b.attribution,
    };
    layers.push({
      id: "basemap-" + key,
      type: "raster",
      source: "basemap-" + key,
      layout: { visibility: key === "std" ? "visible" : "none" },
    });
  }
  return { version: 8, sources, layers };
}

const map = new maplibregl.Map({
  container: "map",
  style: buildStyle(),
  center: APP_CONFIG.initialView.center,
  zoom: APP_CONFIG.initialView.zoom,
  minZoom: APP_CONFIG.initialView.minZoom,
  maxZoom: APP_CONFIG.initialView.maxZoom,
  attributionControl: false,
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");
map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

// ---------------------------------------------------------------------------
// 2. データモデル
//   cells: [lon, lat, total, months[12], air[4], method[7], purpose[13], hokatsu]
// ---------------------------------------------------------------------------
const COL = { LON: 0, LAT: 1, TOTAL: 2, MONTHS: 3, AIR: 4, METHOD: 5, PURPOSE: 6, HOKATSU: 7 };
let META = null;
let CELLS = [];

function cleanLabel(s) {
  return s.replace(/^飛行空域_/, "").replace(/^飛行方法_/, "").replace(/^飛行目的（業務）_/, "").trim();
}

// 現在選択中の指標から「セル → 件数」を取り出す関数を生成
function buildMeasureFn() {
  const group = document.getElementById("measure-group").value;
  const idx = parseInt(document.getElementById("measure-value").value, 10);
  switch (group) {
    case "month":
      return (c) => c[COL.MONTHS][idx] || 0;
    case "airspace":
      return (c) => c[COL.AIR][idx] || 0;
    case "method":
      return (c) => c[COL.METHOD][idx] || 0;
    case "purpose":
      return (c) =>
        idx < c[COL.PURPOSE].length ? c[COL.PURPOSE][idx] || 0 : c[COL.HOKATSU] || 0;
    default:
      return (c) => c[COL.TOTAL];
  }
}

// ---------------------------------------------------------------------------
// 3. 表示メッシュへの再集計
// ---------------------------------------------------------------------------
const EMPTY_FC = { type: "FeatureCollection", features: [] };

function computeMesh(cellSizeKm, measureFn) {
  if (!CELLS.length) return { fc: EMPTY_FC, maxV: 0, sumV: 0, cellCount: 0 };

  const centerLat = APP_CONFIG.initialView.center[1];
  const latStep = cellSizeKm / 111.0;
  const lonStep = cellSizeKm / (111.0 * Math.cos((centerLat * Math.PI) / 180));

  const bins = new Map();
  for (const c of CELLS) {
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

  const features = [];
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
      geometry: { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
    });
  }
  return { fc: { type: "FeatureCollection", features }, maxV, sumV, cellCount: features.length };
}

function computePoints(measureFn) {
  const features = [];
  for (const c of CELLS) {
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

function buildStepExpression() {
  const scale = APP_CONFIG.congestionScale;
  const expr = ["step", ["get", "v"], "rgba(0,0,0,0)"];
  for (const [threshold, color] of scale) expr.push(threshold, color);
  return expr;
}

// ---------------------------------------------------------------------------
// 4. 再描画
// ---------------------------------------------------------------------------
function refresh() {
  const cellSizeKm = parseFloat(document.getElementById("mesh-size").value);
  const measureFn = buildMeasureFn();

  const mesh = computeMesh(cellSizeKm, measureFn);
  const meshSrc = map.getSource("congestion");
  if (meshSrc) meshSrc.setData(mesh.fc);

  const ptSrc = map.getSource("cellpoints");
  if (ptSrc) ptSrc.setData(computePoints(measureFn));

  updateStats(mesh);
}

// ---------------------------------------------------------------------------
// 5. データ読み込みとレイヤー追加
// ---------------------------------------------------------------------------
async function loadData() {
  const res = await fetch(APP_CONFIG.dataUrl);
  if (!res.ok) throw new Error("data fetch failed: " + res.status);
  const data = await res.json();
  META = data.meta;
  CELLS = data.cells;

  populateMeasureValues();

  map.addSource("congestion", { type: "geojson", data: EMPTY_FC });
  map.addLayer({
    id: "congestion-fill",
    type: "fill",
    source: "congestion",
    paint: {
      "fill-color": buildStepExpression(),
      "fill-opacity": 0.62,
      "fill-outline-color": "rgba(255,255,255,0.25)",
    },
  });

  map.addSource("cellpoints", { type: "geojson", data: EMPTY_FC });
  map.addLayer({
    id: "uav-heatmap",
    type: "heatmap",
    source: "cellpoints",
    layout: { visibility: "none" },
    paint: {
      "heatmap-weight": ["interpolate", ["linear"], ["get", "v"], 0, 0, 50, 0.6, 500, 1],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 1, 12, 3],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 8, 12, 35],
      "heatmap-opacity": 0.75,
      "heatmap-color": [
        "interpolate", ["linear"], ["heatmap-density"],
        0, "rgba(0,0,255,0)",
        0.2, "#41b6c4",
        0.4, "#c7e9b4",
        0.6, "#fed976",
        0.8, "#fd8d3c",
        1, "#e31a1c",
      ],
    },
  });

  bindPopups();
  refresh();
}

// ---------------------------------------------------------------------------
// 6. ポップアップ（メッシュクリックで内訳表示）
// ---------------------------------------------------------------------------
function bindPopups() {
  const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "280px" });
  map.on("click", "congestion-fill", (e) => {
    const p = e.features[0].properties;
    const groupLabel = document.getElementById("measure-group").selectedOptions[0].text;
    const valSel = document.getElementById("measure-value");
    const valLabel = valSel.disabled ? "" : "（" + valSel.selectedOptions[0].text + "）";
    const unit = t("unit.plans");
    popup
      .setLngLat(e.lngLat)
      .setHTML(
        `<div class="uav-popup">
           <strong>${t("popup.title")}</strong><br/>
           ${groupLabel}${valLabel}: <b>${Number(p.v).toLocaleString()}</b> ${unit}<br/>
           ${t("popup.total")}: ${Number(p.t).toLocaleString()} ${unit}
         </div>`
      )
      .addTo(map);
  });
  map.on("mouseenter", "congestion-fill", () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", "congestion-fill", () => (map.getCanvas().style.cursor = ""));
}

// ---------------------------------------------------------------------------
// 7. 統計表示
// ---------------------------------------------------------------------------
function updateStats(mesh) {
  if (!META) {
    document.getElementById("stats-content").textContent = t("stats.loading");
    return;
  }
  const plans = t("unit.plans");
  document.getElementById("stats-content").innerHTML =
    `${t("stats.total")}: <b>${Number(META.total_plans).toLocaleString()}</b> ${plans}<br/>` +
    `${t("stats.meshes")}: <b>${Number(mesh.cellCount).toLocaleString()}</b><br/>` +
    `${t("stats.sum")}: <b>${Number(mesh.sumV).toLocaleString()}</b> ${plans}<br/>` +
    `${t("stats.max")}: <b>${Number(mesh.maxV).toLocaleString()}</b> ${t("unit.permesh")}`;
}

// ---------------------------------------------------------------------------
// 8. 指標サブ選択肢の生成（現在言語で）
// ---------------------------------------------------------------------------
function populateMeasureValues() {
  if (!META) return;
  const group = document.getElementById("measure-group").value;
  const sel = document.getElementById("measure-value");
  const prev = sel.value;
  sel.innerHTML = "";

  let items = null;
  if (group === "month") items = META.months.map(monthLabel);
  else if (group === "airspace") items = META.airspace.map((s) => labelFor(cleanLabel(s)));
  else if (group === "method") items = META.method.map((s) => labelFor(cleanLabel(s)));
  else if (group === "purpose") items = META.purpose.map((s) => labelFor(cleanLabel(s)));

  if (!items) {
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  items.forEach((label, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = label;
    sel.appendChild(o);
  });
  if (prev && prev < items.length) sel.value = prev;
}

// ---------------------------------------------------------------------------
// 9. 凡例
// ---------------------------------------------------------------------------
function buildLegend() {
  const bar = document.getElementById("legend-bar");
  const scale = APP_CONFIG.congestionScale;
  const plans = t("unit.plans");
  bar.innerHTML = "";
  for (let i = 0; i < scale.length; i++) {
    const from = scale[i][0];
    const to = i < scale.length - 1 ? scale[i + 1][0] : null;
    const label =
      to === null
        ? `${from.toLocaleString()}+`
        : `${from.toLocaleString()}–${(to - 1).toLocaleString()}`;
    const row = document.createElement("div");
    row.className = "legend-row";
    row.innerHTML =
      `<span class="legend-swatch" style="background:${scale[i][1]}"></span><span>${label} ${plans}</span>`;
    bar.appendChild(row);
  }
}

// ---------------------------------------------------------------------------
// 10. 言語適用
// ---------------------------------------------------------------------------
function applyLanguage(lang) {
  LANG = lang;
  try { localStorage.setItem("uav-lang", lang); } catch (e) { /* ignore */ }
  document.documentElement.lang = lang;
  document.title = t("doc.title");

  // 静的テキスト
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });

  // 言語ボタンの状態
  document.querySelectorAll("#lang-switch button").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === lang);
  });

  // 動的部分
  populateMeasureValues();
  buildLegend();
  refresh();
}

// ---------------------------------------------------------------------------
// 11. UI イベント
// ---------------------------------------------------------------------------
function setupUI() {
  // 言語切替
  document.querySelectorAll("#lang-switch button").forEach((btn) => {
    btn.addEventListener("click", () => applyLanguage(btn.dataset.lang));
  });

  // 背景地図切替
  document.querySelectorAll("#basemap-switch button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.basemap;
      for (const key of Object.keys(APP_CONFIG.basemaps)) {
        map.setLayoutProperty(
          "basemap-" + key,
          "visibility",
          key === target ? "visible" : "none"
        );
      }
      document
        .querySelectorAll("#basemap-switch button")
        .forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  // 指標
  document.getElementById("measure-group").addEventListener("change", () => {
    populateMeasureValues();
    refresh();
  });
  document.getElementById("measure-value").addEventListener("change", refresh);
  document.getElementById("mesh-size").addEventListener("change", refresh);

  // レイヤー表示
  document.getElementById("toggle-mesh").addEventListener("change", (e) => {
    if (map.getLayer("congestion-fill"))
      map.setLayoutProperty("congestion-fill", "visibility", e.target.checked ? "visible" : "none");
  });
  document.getElementById("toggle-heatmap").addEventListener("change", (e) => {
    if (map.getLayer("uav-heatmap"))
      map.setLayoutProperty("uav-heatmap", "visibility", e.target.checked ? "visible" : "none");
  });
}

// ---------------------------------------------------------------------------
// 12. 起動
// ---------------------------------------------------------------------------
setupUI();
applyLanguage(LANG); // 静的テキスト・凡例を初期化（データ未取得でも安全）
map.on("load", () => {
  loadData()
    .then(() => applyLanguage(LANG)) // データ取得後に指標選択肢も言語反映
    .catch((err) => {
      console.error(err);
      document.getElementById("stats-content").textContent = t("stats.error");
    });
});
