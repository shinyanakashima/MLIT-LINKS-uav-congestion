import type { Lang } from "../config";
import { t } from "../i18n";
import { Panel } from "./ui";

export default function TitlePanel({ lang }: { lang: Lang }) {
  return (
    <Panel className="absolute left-3 top-3 max-w-[340px] px-3.5 py-3">
      <h1 className="m-0 text-[17px] font-bold">{t(lang, "app.title")}</h1>
      <p className="mt-0.5 text-[12px] font-semibold text-accent">{t(lang, "app.subtitle")}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{t(lang, "app.note")}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">{t(lang, "app.source")}</p>
    </Panel>
  );
}
