import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { APP_CONFIG, type BasemapKey, type Lang } from "../config";
import {
  buildMeasureFn,
  buildStepExpression,
  computeMesh,
  computePoints,
  type MeasureGroup,
  type MeshData,
  type MeshResult,
} from "../lib/congestion";

export interface PopupLabels {
  title: string;
  lineLabel: string; // 例: "月別（2024年7月）"
  totalLabel: string;
  unit: string;
}

interface MapViewProps {
  data: MeshData | null;
  lang: Lang;
  basemap: BasemapKey;
  measureGroup: MeasureGroup;
  measureIdx: number;
  meshKm: number;
  showMesh: boolean;
  showHeatmap: boolean;
  popupLabels: PopupLabels;
  onStats: (r: MeshResult) => void;
}

function buildStyle(): maplibregl.StyleSpecification {
  const sources: maplibregl.StyleSpecification["sources"] = {};
  const layers: maplibregl.LayerSpecification[] = [];
  for (const key of Object.keys(APP_CONFIG.basemaps) as BasemapKey[]) {
    const b = APP_CONFIG.basemaps[key];
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

export default function MapView(props: MapViewProps) {
  const {
    data,
    basemap,
    measureGroup,
    measureIdx,
    meshKm,
    showMesh,
    showHeatmap,
    popupLabels,
    onStats,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupLabelsRef = useRef<PopupLabels>(popupLabels);
  const [ready, setReady] = useState(false);

  // 最新のポップアップ用ラベルを ref に保持（クリックハンドラから参照）
  useEffect(() => {
    popupLabelsRef.current = popupLabels;
  }, [popupLabels]);

  // 地図の生成（マウント時のみ）
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(),
      center: APP_CONFIG.initialView.center,
      zoom: APP_CONFIG.initialView.zoom,
      minZoom: APP_CONFIG.initialView.minZoom,
      maxZoom: APP_CONFIG.initialView.maxZoom,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
      map.addSource("congestion", { type: "geojson", data: empty });
      map.addLayer({
        id: "congestion-fill",
        type: "fill",
        source: "congestion",
        paint: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "fill-color": buildStepExpression() as any,
          "fill-opacity": 0.62,
          "fill-outline-color": "rgba(255,255,255,0.25)",
        },
      });

      map.addSource("cellpoints", { type: "geojson", data: empty });
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

      const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "280px" });
      map.on("click", "congestion-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as { v: number; t: number };
        const L = popupLabelsRef.current;
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div class="uav-popup">
               <strong>${L.title}</strong><br/>
               ${L.lineLabel}: <b>${Number(p.v).toLocaleString()}</b> ${L.unit}<br/>
               ${L.totalLabel}: ${Number(p.t).toLocaleString()} ${L.unit}
             </div>`,
          )
          .addTo(map);
      });
      map.on("mouseenter", "congestion-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "congestion-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  // データ・指標・解像度の変化で再集計
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !data) return;
    const measureFn = buildMeasureFn(measureGroup, measureIdx);
    const mesh = computeMesh(data.cells, meshKm, measureFn);
    (map.getSource("congestion") as maplibregl.GeoJSONSource | undefined)?.setData(mesh.fc);
    (map.getSource("cellpoints") as maplibregl.GeoJSONSource | undefined)?.setData(
      computePoints(data.cells, measureFn),
    );
    onStats(mesh);
  }, [data, measureGroup, measureIdx, meshKm, ready, onStats]);

  // 背景地図切替
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const key of Object.keys(APP_CONFIG.basemaps) as BasemapKey[]) {
      map.setLayoutProperty("basemap-" + key, "visibility", key === basemap ? "visible" : "none");
    }
  }, [basemap, ready]);

  // レイヤー表示トグル
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty("congestion-fill", "visibility", showMesh ? "visible" : "none");
  }, [showMesh, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty("uav-heatmap", "visibility", showHeatmap ? "visible" : "none");
  }, [showHeatmap, ready]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
