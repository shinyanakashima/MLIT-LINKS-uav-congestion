#!/usr/bin/env python3
"""UAV（無人航空機）混雑デモ用のサンプル飛行位置データを生成する。

国土交通省 LINKS（次世代航空モビリティの社会実装）を想定した
デモ用のダミーデータであり、実在の飛行を表すものではない。

主要都市の周辺にクラスタ状の UAV 位置を散布し、各点に高度・機体種別・
事業者などの属性を付与した GeoJSON を出力する。混雑メッシュ自体は
フロントエンド（turf.js）側で動的に集計するため、ここでは点群のみを作る。
"""

import json
import math
import random

# 再現性のためシードを固定
random.seed(20260607)

# (名称, 中心経度, 中心緯度, 機体数, 散布半径[度])
CLUSTERS = [
    ("東京（都心）", 139.767, 35.681, 220, 0.18),
    ("横浜・川崎", 139.638, 35.444, 120, 0.12),
    ("千葉（幕張・成田）", 140.123, 35.676, 90, 0.22),
    ("大阪（都心）", 135.502, 34.694, 150, 0.15),
    ("名古屋", 136.906, 35.181, 100, 0.13),
    ("福岡", 130.401, 33.590, 70, 0.12),
    ("札幌", 141.354, 43.062, 55, 0.14),
    ("仙台", 140.872, 38.268, 45, 0.12),
    ("広島", 132.459, 34.396, 40, 0.10),
    ("那覇", 127.681, 26.212, 35, 0.10),
]

OPERATORS = [
    "LINKS物流", "スカイデリバリー", "アグリドローン", "インフラ点検サービス",
    "災害調査隊", "測量パートナーズ", "メディア空撮",
]

PURPOSES = ["物流", "点検", "農業", "測量", "災害調査", "報道空撮", "警備"]

AIRFRAMES = ["マルチコプター", "VTOL", "固定翼"]


def jitter(center, radius):
    """中心から半径 radius[度] の範囲に正規分布で 1 点を散布する。"""
    # 二次元正規分布（標準偏差 = radius/2）で中心に密度を集める
    dx = random.gauss(0, radius / 2)
    dy = random.gauss(0, radius / 2)
    # 緯度による経度補正
    dx /= max(math.cos(math.radians(center[1])), 0.1)
    return [round(center[0] + dx, 5), round(center[1] + dy, 5)]


def build_features():
    features = []
    fid = 0
    for name, lon, lat, count, radius in CLUSTERS:
        for _ in range(count):
            fid += 1
            coord = jitter((lon, lat), radius)
            features.append({
                "type": "Feature",
                "id": fid,
                "geometry": {"type": "Point", "coordinates": coord},
                "properties": {
                    "id": f"UAV-{fid:04d}",
                    "area": name,
                    "altitude_m": random.choice([30, 50, 80, 100, 120, 150]),
                    "operator": random.choice(OPERATORS),
                    "purpose": random.choice(PURPOSES),
                    "airframe": random.choice(AIRFRAMES),
                    "speed_kmh": round(random.uniform(0, 60), 1),
                },
            })
    return features


def main():
    fc = {
        "type": "FeatureCollection",
        "metadata": {
            "title": "UAV飛行位置サンプルデータ",
            "description": "MLIT-LINKS UAV混雑可視化デモ用のダミーデータ。実在の飛行ではありません。",
            "generated": "2026-06-07",
            "count": 0,
        },
        "features": build_features(),
    }
    fc["metadata"]["count"] = len(fc["features"])
    with open("data/uav-positions.geojson", "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote data/uav-positions.geojson  ({fc['metadata']['count']} features)")


if __name__ == "__main__":
    main()
