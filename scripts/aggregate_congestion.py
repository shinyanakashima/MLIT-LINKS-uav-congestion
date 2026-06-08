#!/usr/bin/env python3
"""LINKS 無人航空機飛行計画データを混雑メッシュへ集計する。

入力: /tmp/links/*.geojson（全16ファイル＝2024年7月〜2025年6月）
出力: data/congestion-mesh.json（軽量・GitHub Pages 配信用）

各飛行計画ポリゴンの重心を 1km 基準メッシュへ振り分け、セルごとに
総数・月別・飛行空域区分・飛行方法・飛行目的（用途）の件数を集計する。
フロントエンドは各セルの中心座標と件数を「重み付きの点」として扱い、
表示メッシュ（2/5/10km）へ再集計する。

データの癖への対応:
- フィールド名の表記ゆれ（末尾スペース等）→ キーを strip して参照
- 包括申請ノイズ（業務目的フラグが多数 1）→ 個別用途に加算せず「包括申請」へ
- 座標は重心の代表点として扱う（元データは秘匿化済みで粒度を上げない）

出典: 国土交通省 Project LINKS「無人航空機飛行計画データ（2025年度）」を加工
"""

import glob
import json
import os
import re
import sys

SRC_DIR = "/tmp/links"
OUT_PATH = "data/congestion-mesh.json"

# 1km 基準メッシュの刻み幅（度）。中心緯度 ~36 度で約 1km。
LAT_STEP = 1.0 / 111.0
LON_STEP = 1.0 / (111.0 * 0.809)  # cos(36deg) ≈ 0.809

# 月の並び（12ヶ月）
MONTHS = [
    "202407", "202408", "202409", "202410", "202411", "202412",
    "202501", "202502", "202503", "202504", "202505", "202506",
]
MONTH_INDEX = {m: i for i, m in enumerate(MONTHS)}

# 集計対象フラグ（正規化後のキー）
AIRSPACE = ["飛行空域_DID", "飛行空域_150m", "飛行空域_空港周辺", "飛行空域_対象無し"]
METHOD = [
    "飛行方法_30m", "飛行方法_催し物", "飛行方法_夜間", "飛行方法_目視外",
    "飛行方法_危険物", "飛行方法_物件投下", "飛行方法_対象無し",
]
PURPOSE = [
    "飛行目的（業務）_空撮", "飛行目的（業務）_報道取材", "飛行目的（業務）_警備",
    "飛行目的（業務）_農林水産業", "飛行目的（業務）_測量", "飛行目的（業務）_環境調査",
    "飛行目的（業務）_設備メンテナンス", "飛行目的（業務）_インフラ点検・保守",
    "飛行目的（業務）_資材管理", "飛行目的（業務）_輸送・宅配", "飛行目的（業務）_自然観測",
    "飛行目的（業務）_事故・災害対応等", "飛行目的（業務）_その他",
]
# 業務目的フラグがこの数以上立っていれば「包括申請」とみなし個別用途へ加算しない
COMPREHENSIVE_THRESHOLD = 6


class Cell:
    __slots__ = ("lon_sum", "lat_sum", "total", "months", "air", "method", "purpose", "hokatsu")

    def __init__(self):
        self.lon_sum = 0.0
        self.lat_sum = 0.0
        self.total = 0
        self.months = [0] * len(MONTHS)
        self.air = [0] * len(AIRSPACE)
        self.method = [0] * len(METHOD)
        self.purpose = [0] * len(PURPOSE)
        self.hokatsu = 0


def centroid(geom):
    """Polygon / MultiPolygon の代表重心（外周頂点の平均）を返す。"""
    t = geom.get("type")
    coords = geom.get("coordinates")
    if not coords:
        return None
    if t == "Polygon":
        ring = coords[0]
    elif t == "MultiPolygon":
        ring = coords[0][0]
    else:
        return None
    # 閉合の重複点を除外
    pts = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
    if not pts:
        return None
    sx = sum(p[0] for p in pts)
    sy = sum(p[1] for p in pts)
    n = len(pts)
    return sx / n, sy / n


def get_int(p, key):
    v = p.get(key)
    try:
        return 1 if int(v) == 1 else 0
    except (TypeError, ValueError):
        return 0


def process_file(path, cells):
    month = None
    m = re.search(r"(\d{6})", os.path.basename(path))
    if m and m.group(1) in MONTH_INDEX:
        month = MONTH_INDEX[m.group(1)]
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    feats = data.get("features", [])
    n = 0
    for feat in feats:
        geom = feat.get("geometry")
        if not geom:
            continue
        c = centroid(geom)
        if not c:
            continue
        lon, lat = c
        if not (120 <= lon <= 154 and 20 <= lat <= 46):  # 日本域外を除外
            continue
        # プロパティのキーを正規化（前後空白除去）
        p = {k.strip(): v for k, v in (feat.get("properties") or {}).items()}

        i = int(lon // LON_STEP)
        j = int(lat // LAT_STEP)
        key = (i, j)
        cell = cells.get(key)
        if cell is None:
            cell = Cell()
            cells[key] = cell
        cell.lon_sum += lon
        cell.lat_sum += lat
        cell.total += 1
        if month is not None:
            cell.months[month] += 1
        for idx, k in enumerate(AIRSPACE):
            cell.air[idx] += get_int(p, k)
        for idx, k in enumerate(METHOD):
            cell.method[idx] += get_int(p, k)
        # 用途: 包括申請ノイズを分離
        flags = [get_int(p, k) for k in PURPOSE]
        if sum(flags) >= COMPREHENSIVE_THRESHOLD:
            cell.hokatsu += 1
        else:
            for idx, v in enumerate(flags):
                cell.purpose[idx] += v
        n += 1
    return n


def main():
    files = sorted(glob.glob(os.path.join(SRC_DIR, "*.geojson")))
    if not files:
        print("no input files in", SRC_DIR, file=sys.stderr)
        sys.exit(1)
    cells = {}
    grand = 0
    for path in files:
        n = process_file(path, cells)
        grand += n
        print(f"  {os.path.basename(path)}: {n} features  (cells so far: {len(cells)})")

    # 出力（配列でコンパクトに）
    out_cells = []
    for (i, j), c in cells.items():
        lon = round(c.lon_sum / c.total, 5)
        lat = round(c.lat_sum / c.total, 5)
        out_cells.append([
            lon, lat, c.total,
            c.months, c.air, c.method, c.purpose, c.hokatsu,
        ])

    out = {
        "meta": {
            "title": "UAV飛行計画 混雑メッシュ（1km基準）",
            "source": "国土交通省 Project LINKS『無人航空機飛行計画データ（2025年度）』を加工して作成",
            "period": "2024-07 / 2025-06",
            "note": "申請ベースの飛行計画であり実飛行ではありません。データ品質は非保証。",
            "total_plans": grand,
            "cell_count": len(out_cells),
            "months": MONTHS,
            "airspace": AIRSPACE,
            "method": METHOD,
            "purpose": PURPOSE + ["包括申請"],
            "schema": "[lon, lat, total, months[12], airspace[4], method[7], purpose[13], hokatsu]",
        },
        "cells": out_cells,
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    size = os.path.getsize(OUT_PATH)
    print(f"\nwrote {OUT_PATH}")
    print(f"  total plans: {grand}  cells: {len(out_cells)}  size: {size/1e6:.2f} MB")


if __name__ == "__main__":
    main()
