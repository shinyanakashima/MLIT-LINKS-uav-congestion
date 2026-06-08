/**
 * アプリ全体の設定値。
 * 背景地図はすべて国土地理院（地理院地図）のタイルを利用する。
 *   利用規約: https://maps.gsi.go.jp/development/ichiran.html
 *
 * 表示データは国土交通省 Project LINKS の無人航空機飛行計画データ（2025年度）を
 * 1km 基準メッシュへ集計した結果（data/congestion-mesh.json）。
 */
const APP_CONFIG = {
  // 初期表示（日本全体が収まる位置）
  initialView: {
    center: [137.5, 37.0],
    zoom: 4.6,
    minZoom: 4,
    maxZoom: 14,
  },

  // 地理院地図タイル定義
  basemaps: {
    std: {
      tiles: ["https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"],
      maxzoom: 18,
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>',
    },
    pale: {
      tiles: ["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"],
      maxzoom: 18,
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>',
    },
    photo: {
      tiles: ["https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg"],
      maxzoom: 18,
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院（シームレス空中写真）</a>',
    },
  },

  // 集計済み混雑メッシュデータ
  dataUrl: "data/congestion-mesh.json",

  // 混雑度カラースケール（対数的しきい値 → 色）。件数の偏りが大きいため対数刻み。
  congestionScale: [
    [1, "#ffffb2"],
    [5, "#fed976"],
    [10, "#feb24c"],
    [25, "#fd8d3c"],
    [50, "#fc4e2a"],
    [100, "#e31a1c"],
    [500, "#bd0026"],
    [2000, "#800026"],
  ],
};

// ---------------------------------------------------------------------------
// 多言語辞書（UI 静的テキスト）
// ---------------------------------------------------------------------------
const I18N = {
  ja: {
    "doc.title": "UAV飛行計画 混雑・空域マップ | MLIT-LINKS",
    "app.title": "UAV飛行計画 混雑・空域マップ",
    "app.subtitle": "MLIT-LINKS 次世代航空モビリティ",
    "app.note":
      "表示は<strong>飛行計画（申請）ベース</strong>であり、実際の飛行・実態を示すものではありません。元データはスキャン資料からの抽出のため、完全性・正確性は保証されません。",
    "app.source": "出典：国土交通省 Project LINKS「無人航空機飛行計画データ（2025年度）」を加工して作成",
    "label.basemap": "背景地図",
    "label.measure": "表示する指標",
    "label.mesh": "メッシュ解像度",
    "label.layers": "表示レイヤー",
    "label.stats": "統計",
    "label.legend": "混雑度（件数 / メッシュ）",
    "label.lang": "言語",
    "basemap.std": "標準",
    "basemap.pale": "淡色",
    "basemap.photo": "衛星",
    "measure.total": "総数（全期間）",
    "measure.month": "月別",
    "measure.airspace": "飛行空域 区分別",
    "measure.method": "飛行方法別",
    "measure.purpose": "飛行目的（用途）別",
    "mesh.fine": "細かい（2km）",
    "mesh.std": "標準（5km）",
    "mesh.coarse": "粗い（10km）",
    "toggle.mesh": "混雑メッシュ",
    "toggle.heatmap": "ヒートマップ",
    "stats.loading": "読み込み中…",
    "stats.error": "データの読み込みに失敗しました。",
    "stats.total": "総飛行計画数",
    "stats.meshes": "表示メッシュ数",
    "stats.sum": "表示中合計",
    "stats.max": "最大混雑",
    "unit.plans": "件",
    "unit.permesh": "件/メッシュ",
    "popup.title": "このメッシュの飛行計画",
    "popup.total": "総数（全期間）",
  },
  en: {
    "doc.title": "UAV Flight Plan Congestion & Airspace Map | MLIT-LINKS",
    "app.title": "UAV Flight Plan Congestion & Airspace Map",
    "app.subtitle": "MLIT-LINKS Advanced Air Mobility",
    "app.note":
      "Data is <strong>flight-plan (application) based</strong> and does not represent actual flights. The source is extracted from scanned documents, so completeness and accuracy are not guaranteed.",
    "app.source":
      "Source: Processed from MLIT Project LINKS “UAV Flight Plan Data (FY2025)”.",
    "label.basemap": "Base map",
    "label.measure": "Measure",
    "label.mesh": "Mesh size",
    "label.layers": "Layers",
    "label.stats": "Statistics",
    "label.legend": "Congestion (plans / mesh)",
    "label.lang": "Language",
    "basemap.std": "Standard",
    "basemap.pale": "Pale",
    "basemap.photo": "Satellite",
    "measure.total": "Total (all period)",
    "measure.month": "By month",
    "measure.airspace": "By airspace category",
    "measure.method": "By flight method",
    "measure.purpose": "By purpose",
    "mesh.fine": "Fine (2km)",
    "mesh.std": "Standard (5km)",
    "mesh.coarse": "Coarse (10km)",
    "toggle.mesh": "Congestion mesh",
    "toggle.heatmap": "Heatmap",
    "stats.loading": "Loading…",
    "stats.error": "Failed to load data.",
    "stats.total": "Total flight plans",
    "stats.meshes": "Meshes shown",
    "stats.sum": "Sum shown",
    "stats.max": "Max congestion",
    "unit.plans": "plans",
    "unit.permesh": "plans/mesh",
    "popup.title": "Flight plans in this mesh",
    "popup.total": "Total (all period)",
  },
};

// カテゴリ名の対訳（日本語の正規化済みラベル → 英語）
const LABELS_EN = {
  // 飛行空域
  "DID": "DID (densely inhabited)",
  "150m": "Above 150m",
  "空港周辺": "Near airport",
  "対象無し": "None",
  // 飛行方法
  "30m": "Within 30m",
  "催し物": "Over events",
  "夜間": "Night",
  "目視外": "BVLOS",
  "危険物": "Hazardous materials",
  "物件投下": "Object dropping",
  // 飛行目的（用途）
  "空撮": "Aerial photography",
  "報道取材": "News coverage",
  "警備": "Security",
  "農林水産業": "Agriculture/forestry/fishery",
  "測量": "Surveying",
  "環境調査": "Environmental survey",
  "設備メンテナンス": "Equipment maintenance",
  "インフラ点検・保守": "Infrastructure inspection",
  "資材管理": "Material management",
  "輸送・宅配": "Transport/delivery",
  "自然観測": "Nature observation",
  "事故・災害対応等": "Accident/disaster response",
  "その他": "Other",
  "包括申請": "Comprehensive application",
};
