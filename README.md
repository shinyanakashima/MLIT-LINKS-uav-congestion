# UAV飛行計画 混雑・空域マップ（MLIT-LINKS）

国土交通省 Project LINKS が公開する**無人航空機（UAV / ドローン）の飛行計画データ**を、
地図上で「どこに飛行計画が集中しているか」「どの空域区分に該当するか」が一目で分かるように
可視化した Web マップです。背景地図には国土地理院の地理院地図を用いています。

**🌐 デモ: https://shinyanakashima.github.io/MLIT-LINKS-uav-congestion/**

> *An interactive web map visualizing the congestion and airspace categories of UAV (drone)
> flight plans in Japan, based on open data from MLIT Project LINKS. The interface is available
> in both Japanese and English (toggle at the top-right).*

---

## このマップでわかること

ドローンの操縦者・運航事業者が、飛行を計画しているエリアについて次のことを事前に把握できます。

- **混雑状況** … その地域にどれだけの飛行計画（申請）が出ているか
- **空域区分** … DID（人口集中地区）/ 150m 以上 / 空港周辺 などのどれに該当する計画が多いか
- **傾向** … 月別の推移、飛行方法（夜間・目視外など）別、飛行目的（用途）別の内訳

> ⚠️ **重要な注意**
> 表示しているのは **飛行計画（申請）** であり、**実際に飛行が行われた記録ではありません**。
> また元データは紙資料のスキャンから抽出されたものであり、完全性・正確性は保証されません。
> 「この地域でどの程度の申請が出ているか」という傾向把握の用途に限定してご利用ください。

---

## 使い方

画面右上のコントロールパネルで表示を切り替えられます。

| 操作 | 内容 |
| --- | --- |
| **言語 / Language** | 日本語 ⇄ English を切替（選択はブラウザに保存されます） |
| **背景地図** | 標準地図 / 淡色地図 / 衛星写真（地理院地図） |
| **表示する指標** | 総数 / 月別 / 飛行空域区分別 / 飛行方法別 / 飛行目的別。下段で具体的な項目を選択 |
| **メッシュ解像度** | 集計の細かさを 2km / 5km / 10km から選択 |
| **表示レイヤー** | 混雑メッシュ（色塗り）とヒートマップの表示・非表示 |

- 地図上の**メッシュをクリック**すると、そのエリアの件数内訳がポップアップ表示されます。
- 色が濃い（赤に近い）ほど、選択中の指標の件数が多いことを示します（凡例は画面左下）。

---

## 用語説明

| 用語 | 説明 |
| --- | --- |
| **飛行計画** | ドローンを飛ばす前に提出される申請。本マップの集計単位（1件＝1申請）。 |
| **混雑メッシュ** | 地図を格子状に区切り、各マスに含まれる飛行計画の件数を色で表したもの。 |
| **DID（人口集中地区）** | 国勢調査で定義される人口が集中した地区。飛行に許可が必要な空域区分の一つ。 |
| **150m以上** | 地表・水面から150m以上の高さの空域。飛行に許可が必要。 |
| **空港周辺** | 空港等の周辺空域。飛行に許可が必要。 |
| **目視外（BVLOS）** | 操縦者が機体を直接目視せずに飛行させる方法。 |
| **包括申請** | 期間・場所をまとめて一括で申請する方式。多数の目的が同時に申請される傾向がある。 |

## データについて

| 項目 | 内容 |
| --- | --- |
| 出典 | 国土交通省 [Project LINKS](https://www.mlit.go.jp/links/)「無人航空機飛行計画データ（2025年度）」 |
| データ配布元 | [geospatial.jp（CKAN）](https://www.geospatial.jp/ckan/dataset/links-mujinkoukuukihikoukeikaku-2025_) |
| 対象期間 | 2024年7月 〜 2025年6月（月次・全16ファイル） |
| 規模 | 飛行計画 **約297万件**（生データ合計 約8.5GB） |
| ライセンス | 公共データ利用規約（第1.0版）／ CC BY 4.0 互換・商用利用可・**出典表記が必要** |

**出典表記**:
> 出典：国土交通省 Project LINKS「無人航空機飛行計画データ（2025年度）」を加工して作成

### なぜ「メッシュ集計」しているか（前処理の考え方）

約297万件・数GBの飛行範囲ポリゴンをそのままブラウザへ配信することは現実的ではありません。
そこで各飛行計画ポリゴンの**重心**を求め、全国を覆う **1km 基準メッシュ**（約9.4万セル）へ
集計しています。各セルには「総数・月別・飛行空域区分・飛行方法・飛行目的」ごとの件数を保持し、
全体を **約10MB（gzip 圧縮で約2MB）の JSON**（`data/congestion-mesh.json`）にまとめています。
ブラウザ側ではこのセルを重み付きの点とみなし、選択された解像度（2 / 5 / 10km）へ再集計して描画します。

元データの特性に対しては、前処理で次の対応を行っています。

- **項目名の表記ゆれ**（末尾の空白など）→ 正規化したうえで参照
- **包括申請**（多数の業務目的フラグが立つ申請）→ 個別用途に重複加算せず「包括申請」として分離
- **位置情報の秘匿化** → 元データは市区町村重心レベルに秘匿化済み。粒度を上げる二次加工は行わない

---

## 技術構成

| 区分 | 内容 |
| --- | --- |
| フロントエンド | React + TypeScript |
| ビルド | Vite |
| スタイリング | Tailwind CSS v4 |
| 地図エンジン | [MapLibre GL JS](https://maplibre.org/) 4.x（npm 同梱・API キー不要・CDN 非依存） |
| 背景地図 | [地理院タイル（国土地理院）](https://maps.gsi.go.jp/development/ichiran.html) |
| 前処理 | Python 3（標準ライブラリのみ・追加依存なし） |
| ホスティング | GitHub Pages（GitHub Actions でビルド・自動デプロイ） |

地図ライブラリは CDN ではなく npm 依存として同梱し、ビルド成果物を配信します。

---

## ローカルで動かす

```bash
git clone https://github.com/shinyanakashima/MLIT-LINKS-uav-congestion.git
cd MLIT-LINKS-uav-congestion
npm install
npm run dev
# 表示された http://localhost:5173/... を開く
```

本番相当のビルドを確認する場合:

```bash
npm run build    # dist/ を生成
npm run preview  # ビルド結果をプレビュー
```

配信用データ（`public/data/congestion-mesh.json`）はリポジトリに同梱されているため、
これだけで動作します。

## 配信データを再生成する

元データの更新時などに、配信用 JSON を作り直す手順です（数GBのダウンロードと
集計処理が走るため時間がかかります）。

```bash
# 1. 生データ（全16ファイル・約8.5GB）を /tmp/links へ取得
bash scripts/download_links_data.sh

# 2. 1km 基準メッシュへ集計して data/congestion-mesh.json を出力
python3 scripts/aggregate_congestion.py
```

---

## ディレクトリ構成

```
.
├── index.html                      # Vite エントリポイント
├── vite.config.ts                  # Vite 設定（base パス等）
├── src/
│   ├── main.tsx                    # ルートマウント
│   ├── App.tsx                     # 状態管理・レイアウト
│   ├── config.ts                   # 地図・タイル・カラースケール・多言語辞書
│   ├── i18n.ts                     # 多言語ヘルパー
│   ├── lib/congestion.ts           # メッシュ再集計ロジック
│   ├── map/MapView.tsx             # MapLibre 地図コンポーネント
│   └── components/                 # UI（コントロール・凡例・タイトル等）
├── public/
│   └── data/congestion-mesh.json   # 配信用の集計済み混雑メッシュデータ
├── scripts/
│   ├── download_links_data.sh      # 生データ取得スクリプト
│   └── aggregate_congestion.py     # 混雑メッシュ集計スクリプト
└── .github/workflows/deploy.yml    # GitHub Pages ビルド・自動デプロイ
```

---

## デプロイ

`main` ブランチへ push すると `.github/workflows/deploy.yml` が実行され、
Vite でビルドした `dist/` が GitHub Pages へ自動公開されます。フォークして自分の環境で
公開する場合は、リポジトリの **Settings → Pages → Source** を **GitHub Actions** に
設定してください。別パスで公開する場合は `vite.config.ts` の `base` を変更します。

---

## ライセンス・クレジット

- **飛行計画データ**: 国土交通省 Project LINKS（公共データ利用規約 第1.0版 / CC BY 4.0 互換）
- **背景地図**: [地理院タイル（国土地理院）](https://maps.gsi.go.jp/development/ichiran.html)
- **地図エンジン**: [MapLibre GL JS](https://maplibre.org/)（BSD-3-Clause）
