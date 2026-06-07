/**
 * アプリ全体の設定値。
 * 背景地図はすべて国土地理院（地理院地図）のタイルを利用する。
 *   利用規約: https://maps.gsi.go.jp/development/ichiran.html
 */
const APP_CONFIG = {
  // 初期表示（日本全体が収まる位置）
  initialView: {
    center: [137.5, 37.0],
    zoom: 4.6,
    minZoom: 4,
    maxZoom: 17,
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

  // UAV 位置データ
  dataUrl: "data/uav-positions.geojson",

  // 混雑度カラースケール（機体数 → 色）
  // [しきい値, 色] の昇順。凡例とメッシュ着色の双方で利用する。
  congestionScale: [
    [0, "#2c7fb8"],
    [3, "#41b6c4"],
    [6, "#7fcdbb"],
    [10, "#c7e9b4"],
    [15, "#fed976"],
    [25, "#fd8d3c"],
    [40, "#e31a1c"],
  ],
};
