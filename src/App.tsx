import { useCallback, useEffect, useState } from "react";
import { APP_CONFIG, type BasemapKey, type Lang } from "./config";
import { cleanLabel, getInitialLang, labelFor, monthLabel, saveLang, t } from "./i18n";
import type { MeasureGroup, MeshData, MeshResult } from "./lib/congestion";
import MapView, { type PopupLabels } from "./map/MapView";
import ControlPanel from "./components/ControlPanel";
import TitlePanel from "./components/TitlePanel";
import Legend from "./components/Legend";

export default function App() {
  const [lang, setLangState] = useState<Lang>(getInitialLang());
  const [basemap, setBasemap] = useState<BasemapKey>("std");
  const [measureGroup, setMeasureGroup] = useState<MeasureGroup>("total");
  const [measureIdx, setMeasureIdx] = useState(0);
  const [meshKm, setMeshKm] = useState(5);
  const [showMesh, setShowMesh] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const [data, setData] = useState<MeshData | null>(null);
  const [stats, setStats] = useState<MeshResult | null>(null);
  const [error, setError] = useState(false);

  const setLang = useCallback((v: Lang) => {
    setLangState(v);
    saveLang(v);
  }, []);

  // 言語に応じて文書メタを更新
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t(lang, "doc.title");
  }, [lang]);

  // データ取得
  useEffect(() => {
    const url = import.meta.env.BASE_URL + APP_CONFIG.dataPath;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("data fetch failed: " + res.status);
        return res.json();
      })
      .then((json: MeshData) => setData(json))
      .catch((e) => {
        console.error(e);
        setError(true);
      });
  }, []);

  const onStats = useCallback((r: MeshResult) => setStats(r), []);

  // ポップアップ用ラベル（現在の指標・言語から組み立て）
  const popupLabels: PopupLabels = (() => {
    const groupLabel = t(lang, "measure." + measureGroup);
    let valueLabel = "";
    if (data) {
      const m = data.meta;
      if (measureGroup === "month") valueLabel = monthLabel(lang, m.months[measureIdx]);
      else if (measureGroup === "airspace") valueLabel = labelFor(lang, cleanLabel(m.airspace[measureIdx]));
      else if (measureGroup === "method") valueLabel = labelFor(lang, cleanLabel(m.method[measureIdx]));
      else if (measureGroup === "purpose") valueLabel = labelFor(lang, cleanLabel(m.purpose[measureIdx]));
    }
    const lineLabel = valueLabel ? `${groupLabel}（${valueLabel}）` : groupLabel;
    return {
      title: t(lang, "popup.title"),
      lineLabel,
      totalLabel: t(lang, "popup.total"),
      unit: t(lang, "unit.plans"),
    };
  })();

  return (
    <div className="relative h-full w-full">
      <MapView
        data={data}
        lang={lang}
        basemap={basemap}
        measureGroup={measureGroup}
        measureIdx={measureIdx}
        meshKm={meshKm}
        showMesh={showMesh}
        showHeatmap={showHeatmap}
        popupLabels={popupLabels}
        onStats={onStats}
      />

      <TitlePanel lang={lang} />
      <Legend lang={lang} />
      <ControlPanel
        lang={lang}
        setLang={setLang}
        basemap={basemap}
        setBasemap={setBasemap}
        measureGroup={measureGroup}
        setMeasureGroup={setMeasureGroup}
        measureIdx={measureIdx}
        setMeasureIdx={setMeasureIdx}
        meshKm={meshKm}
        setMeshKm={setMeshKm}
        showMesh={showMesh}
        setShowMesh={setShowMesh}
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        meta={data?.meta ?? null}
        stats={stats}
      />

      {error && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-sm text-red-600">
          {t(lang, "stats.error")}
        </div>
      )}
    </div>
  );
}
