import { APP_CONFIG, type Lang } from "../config";
import { t } from "../i18n";
import { Panel } from "./ui";

export default function Legend({ lang }: { lang: Lang }) {
  const scale = APP_CONFIG.congestionScale;
  const plans = t(lang, "unit.plans");
  return (
    <Panel className="absolute bottom-7 left-3 hidden w-[230px] px-3.5 py-3 sm:block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
        {t(lang, "label.legend")}
      </span>
      <div className="mt-2 flex flex-col gap-1">
        {scale.map(([from, color], i) => {
          const to = i < scale.length - 1 ? scale[i + 1][0] : null;
          const label =
            to === null
              ? `${from.toLocaleString()}+`
              : `${from.toLocaleString()}–${(to - 1).toLocaleString()}`;
          return (
            <div key={from} className="flex items-center gap-2 text-[12px]">
              <span
                className="h-3.5 w-[22px] flex-none rounded-[3px] border border-black/15"
                style={{ background: color }}
              />
              <span>
                {label} {plans}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
