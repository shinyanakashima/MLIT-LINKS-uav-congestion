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
      label: "標準",
      tiles: ["https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"],
      maxzoom: 18,
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>',
    },
    pale: {
      label: "淡色",
      tiles: ["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"],
      maxzoom: 18,
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>',
    },
    photo: {
      label: "衛星",
      tiles: ["https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg"],
      maxzoom: 18,
      attribution:
        '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院（シームレス空中写真）</a>',
    },
  },

  // 集計済み混雑メッシュデータ
  dataUrl: "data/congestion-mesh.json",

  // 混雑度カラースケール（対数的しきい値 → 色）。件数の偏りが大きいため対数刻み。
  // [しきい値, 色] の昇順。先頭は「しきい値以上 次のしきい値未満」の最小区分。
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

  // 出典表記（必須）
  attributionText:
    "出典：国土交通省 Project LINKS「無人航空機飛行計画データ（2025年度）」を加工して作成",
};
