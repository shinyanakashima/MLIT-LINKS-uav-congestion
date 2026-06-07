/* global maplibregl, APP_CONFIG */
"use strict";

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
      // 初期は「標準」のみ表示
      layout: { visibility: key === "std" ? "visible" : "none" },
    });
  }
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources,
    layers,
  };
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
map.addControl(
  new maplibregl.AttributionControl({ compact: true }),
  "bottom-right"
);

// ---------------------------------------------------------------------------
// 2. カラースケールのユーティリティ
// ---------------------------------------------------------------------------
function congestionColor(count) {
  const scale = APP_CONFIG.congestionScale;
  let color = scale[0][1];
  for (const [threshold, c] of scale) {
    if (count >= threshold) color = c;
  }
  return color;
}

// MapLibre の step 式を生成（fill-color 用）
function buildStepExpression() {
  const scale = APP_CONFIG.congestionScale;
  const expr = ["step", ["get", "count"], scale[0][1]];
  for (let i = 1; i < scale.length; i++) {
    expr.push(scale[i][0], scale[i][1]);
  }
  return expr;
}

// ---------------------------------------------------------------------------
// 3. 混雑メッシュ（矩形メッシュ）の集計
//    日本の地域メッシュ（JIS 標準地域メッシュ）に倣い矩形セルで集計する。
//    点を直接セルへビニングするため、計算量は O(点数) で軽量。
// ---------------------------------------------------------------------------
let uavData = null; // 読み込んだ UAV 位置 FeatureCollection

const EMPTY_FC = { type: "FeatureCollection", features: [] };

function computeCongestion(cellSizeKm) {
  if (!uavData || uavData.features.length === 0) return EMPTY_FC;

  // セルサイズ（km）を緯度経度の刻み幅（度）へ換算
  const center = APP_CONFIG.initialView.center;
  const latStep = cellSizeKm / 111.0;
  const lonStep = cellSizeKm / (111.0 * Math.cos((center[1] * Math.PI) / 180));

  // セルへビニング（キー = "列_行"）
  const bins = new Map();
  for (const pt of uavData.features) {
    const [lon, lat] = pt.geometry.coordinates;
    const i = Math.floor(lon / lonStep);
    const j = Math.floor(lat / latStep);
    const key = i + "_" + j;
    bins.set(key, (bins.get(key) || 0) + 1);
  }

  // 非空セルのみを矩形ポリゴンとして出力
  const features = [];
  for (const [key, count] of bins) {
    const [i, j] = key.split("_").map(Number);
    const w = i * lonStep;
    const e = w + lonStep;
    const s = j * latStep;
    const n = s + latStep;
    features.push({
      type: "Feature",
      properties: { count },
      geometry: {
        type: "Polygon",
        coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
      },
    });
  }
  return { type: "FeatureCollection", features };
}

function refreshCongestion() {
  const cellSizeKm = parseFloat(document.getElementById("mesh-size").value);
  const fc = computeCongestion(cellSizeKm);
  const src = map.getSource("congestion");
  if (src) src.setData(fc);
  updateStats(fc);
}

// ---------------------------------------------------------------------------
// 4. データ読み込みとレイヤー追加
// ---------------------------------------------------------------------------
async function loadData() {
  const res = await fetch(APP_CONFIG.dataUrl);
  if (!res.ok) throw new Error("データ取得に失敗しました: " + res.status);
  uavData = await res.json();

  // --- 混雑メッシュ（塗りつぶし） ---
  map.addSource("congestion", { type: "geojson", data: EMPTY_FC });
  map.addLayer({
    id: "congestion-fill",
    type: "fill",
    source: "congestion",
    paint: {
      "fill-color": buildStepExpression(),
      "fill-opacity": 0.55,
      "fill-outline-color": "rgba(255,255,255,0.35)",
    },
  });

  // --- ヒートマップ ---
  map.addSource("uav", { type: "geojson", data: uavData });
  map.addLayer({
    id: "uav-heatmap",
    type: "heatmap",
    source: "uav",
    layout: { visibility: "none" },
    paint: {
      "heatmap-weight": 0.6,
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 12, 2.5],
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 12, 30],
      "heatmap-opacity": 0.8,
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

  // --- UAV 位置（点） ---
  map.addLayer({
    id: "uav-points",
    type: "circle",
    source: "uav",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 1.8, 12, 5],
      "circle-color": "#1d4ed8",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 0.6,
      "circle-opacity": 0.85,
    },
  });

  bindPointPopups();
  refreshCongestion();
}

// ---------------------------------------------------------------------------
// 5. ポップアップ（UAV 位置クリック）
// ---------------------------------------------------------------------------
function bindPointPopups() {
  const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "260px" });
  map.on("click", "uav-points", (e) => {
    const p = e.features[0].properties;
    popup
      .setLngLat(e.lngLat)
      .setHTML(
        `<div class="uav-popup">
           <strong>${p.id}</strong><br/>
           エリア: ${p.area}<br/>
           用途: ${p.purpose} / ${p.airframe}<br/>
           高度: ${p.altitude_m} m / 速度: ${p.speed_kmh} km/h<br/>
           事業者: ${p.operator}
         </div>`
      )
      .addTo(map);
  });
  map.on("mouseenter", "uav-points", () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", "uav-points", () => (map.getCanvas().style.cursor = ""));
}

// ---------------------------------------------------------------------------
// 6. 統計表示
// ---------------------------------------------------------------------------
function updateStats(congestionFc) {
  const total = uavData ? uavData.features.length : 0;
  let maxCount = 0;
  for (const f of congestionFc.features) {
    if (f.properties.count > maxCount) maxCount = f.properties.count;
  }
  document.getElementById("stats-content").innerHTML =
    `総機体数: <b>${total}</b> 機<br/>` +
    `混雑メッシュ数: <b>${congestionFc.features.length}</b><br/>` +
    `最大混雑: <b>${maxCount}</b> 機/メッシュ`;
}

// ---------------------------------------------------------------------------
// 7. UI イベント
// ---------------------------------------------------------------------------
function setupUI() {
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

  // レイヤー表示トグル
  const toggles = [
    ["toggle-congestion", "congestion-fill"],
    ["toggle-heatmap", "uav-heatmap"],
    ["toggle-points", "uav-points"],
  ];
  toggles.forEach(([inputId, layerId]) => {
    document.getElementById(inputId).addEventListener("change", (e) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", e.target.checked ? "visible" : "none");
      }
    });
  });

  // メッシュ解像度
  document.getElementById("mesh-size").addEventListener("change", refreshCongestion);
}

// ---------------------------------------------------------------------------
// 8. 凡例の生成
// ---------------------------------------------------------------------------
function buildLegend() {
  const bar = document.getElementById("legend-bar");
  const scale = APP_CONFIG.congestionScale;
  bar.innerHTML = "";
  for (let i = 0; i < scale.length; i++) {
    const from = scale[i][0];
    const to = i < scale.length - 1 ? scale[i + 1][0] : null;
    const label = to === null ? `${from}+` : `${from}–${to - 1}`;
    const row = document.createElement("div");
    row.className = "legend-row";
    row.innerHTML =
      `<span class="legend-swatch" style="background:${scale[i][1]}"></span><span>${label} 機</span>`;
    bar.appendChild(row);
  }
}

// ---------------------------------------------------------------------------
// 9. 起動
// ---------------------------------------------------------------------------
buildLegend();
setupUI();
map.on("load", () => {
  loadData().catch((err) => {
    console.error(err);
    document.getElementById("stats-content").textContent =
      "データの読み込みに失敗しました。";
  });
});
