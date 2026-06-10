import { useMemo } from "react";
import type { BasemapKey, Lang } from "../config";
import { cleanLabel, labelFor, monthLabel, t } from "../i18n";
import type { MeasureGroup, Meta, MeshResult } from "../lib/congestion";
import { Field, Panel, Segmented, Select, Toggle, type Option } from "./ui";

interface ControlPanelProps {
  lang: Lang;
  setLang: (v: Lang) => void;
  basemap: BasemapKey;
  setBasemap: (v: BasemapKey) => void;
  measureGroup: MeasureGroup;
  setMeasureGroup: (v: MeasureGroup) => void;
  measureIdx: number;
  setMeasureIdx: (v: number) => void;
  meshKm: number;
  setMeshKm: (v: number) => void;
  showMesh: boolean;
  setShowMesh: (v: boolean) => void;
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean) => void;
  meta: Meta | null;
  stats: MeshResult | null;
}

export default function ControlPanel(props: ControlPanelProps) {
  const { lang, meta, stats } = props;

  const groupOptions: Option<MeasureGroup>[] = [
    { value: "total", label: t(lang, "measure.total") },
    { value: "month", label: t(lang, "measure.month") },
    { value: "airspace", label: t(lang, "measure.airspace") },
    { value: "method", label: t(lang, "measure.method") },
    { value: "purpose", label: t(lang, "measure.purpose") },
  ];

  // 指標サブ選択肢（現在言語・現在グループ）
  const valueOptions = useMemo<Option<string>[]>(() => {
    if (!meta) return [];
    const toOpts = (arr: string[], fmt: (s: string) => string) =>
      arr.map((s, i) => ({ value: String(i), label: fmt(s) }));
    switch (props.measureGroup) {
      case "month":
        return toOpts(meta.months, (s) => monthLabel(lang, s));
      case "airspace":
        return toOpts(meta.airspace, (s) => labelFor(lang, cleanLabel(s)));
      case "method":
        return toOpts(meta.method, (s) => labelFor(lang, cleanLabel(s)));
      case "purpose":
        return toOpts(meta.purpose, (s) => labelFor(lang, cleanLabel(s)));
      default:
        return [];
    }
  }, [meta, props.measureGroup, lang]);

  const n = (v: number) => v.toLocaleString();

  return (
    <Panel className="absolute right-3 top-3 flex max-h-[calc(100vh-24px)] w-[240px] flex-col gap-3.5 overflow-y-auto px-3.5 py-3">
      <Field label={t(lang, "label.lang")}>
        <Segmented<Lang>
          ariaLabel="Language"
          value={lang}
          onChange={props.setLang}
          options={[
            { value: "ja", label: "日本語" },
            { value: "en", label: "English" },
          ]}
        />
      </Field>

      <Field label={t(lang, "label.basemap")}>
        <Segmented<BasemapKey>
          ariaLabel="Base map"
          value={props.basemap}
          onChange={props.setBasemap}
          options={[
            { value: "std", label: t(lang, "basemap.std") },
            { value: "pale", label: t(lang, "basemap.pale") },
            { value: "photo", label: t(lang, "basemap.photo") },
          ]}
        />
      </Field>

      <Field label={t(lang, "label.measure")}>
        <Select<MeasureGroup>
          value={props.measureGroup}
          options={groupOptions}
          onChange={(v) => {
            props.setMeasureGroup(v);
            props.setMeasureIdx(0);
          }}
        />
        <Select
          value={String(props.measureIdx)}
          options={valueOptions}
          disabled={valueOptions.length === 0}
          onChange={(v) => props.setMeasureIdx(Number(v))}
        />
      </Field>

      <Field label={t(lang, "label.mesh")}>
        <Select
          value={String(props.meshKm)}
          onChange={(v) => props.setMeshKm(Number(v))}
          options={[
            { value: "2", label: t(lang, "mesh.fine") },
            { value: "5", label: t(lang, "mesh.std") },
            { value: "10", label: t(lang, "mesh.coarse") },
          ]}
        />
      </Field>

      <Field label={t(lang, "label.layers")}>
        <Toggle checked={props.showMesh} onChange={props.setShowMesh} label={t(lang, "toggle.mesh")} />
        <Toggle
          checked={props.showHeatmap}
          onChange={props.setShowHeatmap}
          label={t(lang, "toggle.heatmap")}
        />
      </Field>

      <Field label={t(lang, "label.stats")}>
        <div className="text-[12px] leading-relaxed text-gray-800">
          {!meta || !stats ? (
            t(lang, "stats.loading")
          ) : (
            <>
              {t(lang, "stats.total")}: <b className="text-accent">{n(meta.total_plans)}</b>{" "}
              {t(lang, "unit.plans")}
              <br />
              {t(lang, "stats.meshes")}: <b className="text-accent">{n(stats.cellCount)}</b>
              <br />
              {t(lang, "stats.sum")}: <b className="text-accent">{n(stats.sumV)}</b>{" "}
              {t(lang, "unit.plans")}
              <br />
              {t(lang, "stats.max")}: <b className="text-accent">{n(stats.maxV)}</b>{" "}
              {t(lang, "unit.permesh")}
            </>
          )}
        </div>
      </Field>
    </Panel>
  );
}
