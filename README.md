# MLIT-LINKS UAV飛行計画 混雑・空域マップ

[MapLibre GL JS](https://maplibre.org/) と **地理院地図（国土地理院）** を用いて、
無人航空機（UAV / ドローン）の **飛行計画（申請）** の混雑状況と飛行空域区分を
可視化する Web マップです。ドローン操縦者・運航事業者が、飛ばしたいエリアに
どれだけの飛行計画が出ていて、どの空域区分（DID / 150m以上 / 空港周辺）に該当するかを
事前に把握することを目的としています。

> ⚠️ 表示は **飛行計画（申請）ベース** であり、実際の飛行・実態を示すものではありません。
> 元データは紙資料のスキャン抽出のため、完全性・正確性は保証されません。

## 機能

- **背景地図の切替**: 地理院地図の「標準」「淡色」「衛星（シームレス空中写真）」
- **混雑メッシュ**: 飛行計画の件数をメッシュ集計し、件数に応じて着色（解像度 2 / 5 / 10 km、対数カラースケール）
- **指標切替**: 総数 / 月別（2024年7月〜2025年6月）/ 飛行空域区分別 / 飛行方法別 / 飛行目的（用途）別
- **ヒートマップ**: 選択中の指標の密度をヒートマップ表示
- **メッシュクリック**: そのメッシュの件数内訳をポップアップ表示
- **統計表示**: 総飛行計画数 / 表示メッシュ数 / 表示中合計 / 最大混雑度

## データ

| 項目 | 内容 |
| --- | --- |
| 出典 | 国土交通省 [Project LINKS](https://www.mlit.go.jp/links/)「無人航空機飛行計画データ（2025年度）」 |
| データページ | https://www.geospatial.jp/ckan/dataset/links-mujinkoukuukihikoukeikaku-2025_ |
| 期間 | 2024年7月 〜 2025年6月（月次・全16ファイル） |
| 規模 | 約 297 万件の飛行計画（生データ合計 約 8.5 GB） |
| ライセンス | 公共データ利用規約（第1.0版）／ CC BY 4.0 互換・商用利用可・**出典表記必須** |

**出典表記**: 出典：国土交通省 Project LINKS「無人航空機飛行計画データ（2025年度）」を加工して作成

### 軽量化（前処理）の方針

約 297 万件・数 GB の個票ポリゴンをそのまま Web 配信するのは非現実的なため、
各飛行計画ポリゴンの **重心** を **1km 基準メッシュ** へ集計し、セルごとに
「総数・月別・飛行空域区分・飛行方法・飛行目的」の件数を保持した軽量 JSON
（`data/congestion-mesh.json`、約 10 MB / gzip 約 2 MB）に変換しています。
フロントエンドは各セル中心を重み付きの点として扱い、表示メッシュ（2/5/10km）へ再集計します。

データの癖への対応（前処理で実施）:

- フィールド名の表記ゆれ（末尾スペース等）→ キーを正規化して参照
- 包括申請ノイズ（業務目的フラグが多数 1 の行）→ 個別用途に加算せず「包括申請」へ分離
- 出発地緯度経度は市区町村重心レベルに秘匿化済み。粒度を上げる二次加工は行わない

## 技術構成

| 区分 | 内容 |
| --- | --- |
| 地図エンジン | MapLibre GL JS 4.x（CDN 読み込み） |
| 背景地図 | 地理院地図タイル（`cyberjapandata.gsi.go.jp`） |
| 前処理 | Python（標準ライブラリのみ） |
| 構成 | ビルド不要の静的サイト（HTML / CSS / Vanilla JS） |

## ローカルでの実行

```bash
python3 -m http.server 8000
# → http://localhost:8000 を開く
```

## データの再生成

```bash
# 1. 生データ（全16ファイル・約8.5GB）を /tmp/links へ取得
bash scripts/download_links_data.sh

# 2. 混雑メッシュへ集計して data/congestion-mesh.json を出力
python3 scripts/aggregate_congestion.py
```

## ディレクトリ構成

```
.
├── index.html                  # エントリポイント
├── css/style.css               # スタイル
├── js/
│   ├── config.js               # 地図・タイル・カラースケール・出典設定
│   └── map.js                  # 地図初期化・集計・レイヤー・UI 制御
├── data/
│   └── congestion-mesh.json    # 集計済み混雑メッシュ（配信データ）
├── scripts/
│   ├── download_links_data.sh  # 生データ取得
│   └── aggregate_congestion.py # 混雑メッシュ集計
└── .github/workflows/deploy.yml # GitHub Pages 自動デプロイ
```

## デプロイ（GitHub Pages）

`main` ブランチへの push で `.github/workflows/deploy.yml` が実行され、
GitHub Pages へ自動公開されます。リポジトリ設定の **Settings → Pages → Source** を
**GitHub Actions** に設定してください。

## ライセンス・出典

- 飛行計画データ: 国土交通省 Project LINKS（公共データ利用規約 第1.0版 / CC BY 4.0 互換）
- 背景地図: [地理院タイル（国土地理院）](https://maps.gsi.go.jp/development/ichiran.html)
- 地図エンジン: MapLibre GL JS（BSD-3-Clause）
