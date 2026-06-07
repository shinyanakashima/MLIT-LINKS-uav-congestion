# MLIT-LINKS UAV混雑可視化マップ

[MapLibre GL JS](https://maplibre.org/) と **地理院地図（国土地理院）** を用いた、
UAV（無人航空機 / ドローン）の飛行混雑を可視化する Web マップのデモです。
国土交通省 LINKS（次世代航空モビリティの社会実装）に関連するユースケースを想定しています。

> ⚠️ 現在表示しているデータは **デモ用のダミー** であり、実在の飛行を示すものではありません。

## 機能

- **背景地図の切替**: 地理院地図の「標準」「衛星（シームレス空中写真）」「淡色」を切替可能
- **混雑メッシュ**: UAV 位置を六角グリッドで集計し、機体数に応じて着色（解像度 2 / 5 / 10 km）
- **ヒートマップ**: 飛行密度をヒートマップ表示
- **UAV 位置**: 個別の機体をクリックすると属性（用途・高度・速度・事業者など）をポップアップ表示
- **統計表示**: 総機体数 / 混雑メッシュ数 / 最大混雑度

## 技術構成

| 区分 | 内容 |
| --- | --- |
| 地図エンジン | MapLibre GL JS 4.x（CDN 読み込み） |
| 空間集計 | Turf.js 7.x（六角グリッド集計） |
| 背景地図 | 地理院地図タイル（`cyberjapandata.gsi.go.jp`） |
| 構成 | ビルド不要の静的サイト（HTML / CSS / Vanilla JS） |

ビルドステップが無いため、リポジトリをそのまま静的ホスティングに配置するだけで公開できます。

## ローカルでの実行

`fetch` で GeoJSON を読み込むため、ローカルファイル直開きではなく簡易サーバー経由で開きます。

```bash
# Python の場合
python3 -m http.server 8000
# → http://localhost:8000 を開く
```

## ディレクトリ構成

```
.
├── index.html              # エントリポイント
├── css/style.css           # スタイル
├── js/
│   ├── config.js           # 地図・タイル・カラースケール設定
│   └── map.js              # 地図初期化・レイヤー・UI 制御
├── data/
│   └── uav-positions.geojson  # サンプル UAV 位置データ
├── scripts/
│   └── generate_sample_data.py # サンプルデータ生成スクリプト
└── .github/workflows/deploy.yml # GitHub Pages 自動デプロイ
```

## サンプルデータの再生成

```bash
python3 scripts/generate_sample_data.py
```

## デプロイ（GitHub Pages）

`main` ブランチへの push で `.github/workflows/deploy.yml` が実行され、
GitHub Pages へ自動公開されます。リポジトリ設定の **Settings → Pages → Source** を
**GitHub Actions** に設定してください。

## 出典・ライセンス

- 背景地図: [地理院タイル（国土地理院）](https://maps.gsi.go.jp/development/ichiran.html)
- 地図エンジン: MapLibre GL JS（BSD-3-Clause）
- 空間処理: Turf.js（MIT）

地理院タイルの利用にあたっては
[国土地理院 利用規約](https://maps.gsi.go.jp/development/ichiran.html)
を遵守してください。
