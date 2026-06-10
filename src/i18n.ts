import { I18N, LABELS_EN, type Lang } from "./config";

export function t(lang: Lang, key: string): string {
  return I18N[lang]?.[key] ?? I18N.ja[key] ?? key;
}

/** 日本語の正規化済みラベルを現在言語へ */
export function labelFor(lang: Lang, jaLabel: string): string {
  if (lang === "en") return LABELS_EN[jaLabel] ?? jaLabel;
  return jaLabel;
}

/** 集計データの生キー（接頭辞付き）から表示用ラベルへ正規化 */
export function cleanLabel(s: string): string {
  return s
    .replace(/^飛行空域_/, "")
    .replace(/^飛行方法_/, "")
    .replace(/^飛行目的（業務）_/, "")
    .trim();
}

const EN_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "202407" → 言語別の月表記 */
export function monthLabel(lang: Lang, yyyymm: string): string {
  const y = yyyymm.slice(0, 4);
  const m = parseInt(yyyymm.slice(4, 6), 10);
  return lang === "en" ? `${EN_MONTHS[m - 1]} ${y}` : `${y}年${m}月`;
}

export function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem("uav-lang");
    if (saved === "ja" || saved === "en") return saved;
  } catch {
    /* ignore */
  }
  return "ja";
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem("uav-lang", lang);
  } catch {
    /* ignore */
  }
}
