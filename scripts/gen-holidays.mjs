// 日本の祝日データ(2024-2030)を生成する一回限りのスクリプト。
// 生成物 (src/core/holiday/data.ts) は実行時には一切参照されない静的テーブルであり、
// プラグインの実行時に本スクリプトやその計算式が動くことはない（内蔵の静的テーブル方式）。
// 春分の日・秋分の日は国立天文台が公表する近似式（1980-2099年に有効とされる式）で算出し、
// ハッピーマンデー対象の祝日はn番目の月曜日、振替休日・国民の休日は法律の規定に基づき算出する。

function nthMonday(year, month1to12, n) {
  const d = new Date(year, month1to12 - 1, 1);
  const firstDow = d.getDay(); // 0=Sun
  const offsetToFirstMonday = (8 - firstDow) % 7; // days to first Monday
  const day = 1 + offsetToFirstMonday + (n - 1) * 7;
  return new Date(year, month1to12 - 1, day);
}

function vernalEquinoxDay(year) {
  const y = year - 1980;
  return Math.floor(20.8431 + 0.242194 * y - Math.floor(y / 4));
}

function autumnalEquinoxDay(year) {
  const y = year - 1980;
  return Math.floor(23.2488 + 0.242194 * y - Math.floor(y / 4));
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function baseHolidays(year) {
  const list = [];
  const add = (date, name) => list.push({ date: ymd(date), name });

  add(new Date(year, 0, 1), "元日");
  add(nthMonday(year, 1, 2), "成人の日");
  add(new Date(year, 1, 11), "建国記念の日");
  add(new Date(year, 1, 23), "天皇誕生日");
  add(new Date(year, 2, vernalEquinoxDay(year)), "春分の日");
  add(new Date(year, 3, 29), "昭和の日");
  add(new Date(year, 4, 3), "憲法記念日");
  add(new Date(year, 4, 4), "みどりの日");
  add(new Date(year, 4, 5), "こどもの日");
  add(nthMonday(year, 7, 3), "海の日");
  add(new Date(year, 7, 11), "山の日");
  add(nthMonday(year, 9, 3), "敬老の日");
  add(new Date(year, 8, autumnalEquinoxDay(year)), "秋分の日");
  add(nthMonday(year, 10, 2), "スポーツの日");
  add(new Date(year, 10, 3), "文化の日");
  add(new Date(year, 10, 23), "勤労感謝の日");

  return list;
}

function applyNationalHolidayAndSubstitute(list) {
  const map = new Map(list.map((h) => [h.date, h.name]));

  // 国民の休日: 前後を祝日に挟まれた平日（日曜を除く）
  const dates = [...map.keys()].sort();
  for (const d of dates) {
    const date = new Date(d);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const nextKey = ymd(next);
    if (map.has(nextKey)) continue; // 連続祝日は対象外の起点
  }
  // 上記の単純ループでは前後判定がしづらいため、日単位で 1年分走査する。
  const year = new Date(dates[0]).getFullYear();
  for (let month = 0; month < 12; month++) {
    for (let day = 1; day <= 31; day++) {
      const date = new Date(year, month, day);
      if (date.getMonth() !== month) break;
      const key = ymd(date);
      if (map.has(key)) continue;
      if (date.getDay() === 0) continue; // 日曜はそもそも休日
      const prev = new Date(date);
      prev.setDate(prev.getDate() - 1);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      if (map.has(ymd(prev)) && map.has(ymd(next))) {
        map.set(key, "国民の休日");
      }
    }
  }

  // 振替休日: 祝日が日曜の場合、直後の祝日でない日を振替休日とする
  for (const d of [...map.keys()].sort()) {
    const date = new Date(d);
    if (date.getDay() !== 0) continue;
    const substitute = new Date(date);
    do {
      substitute.setDate(substitute.getDate() + 1);
    } while (map.has(ymd(substitute)));
    map.set(ymd(substitute), "振替休日");
  }

  return [...map.entries()]
    .map(([date, name]) => ({ date, name }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
const all = years.flatMap((y) => applyNationalHolidayAndSubstitute(baseHolidays(y)));

const tsLines = [];
tsLines.push("/**");
tsLines.push(" * 日本の祝日 静的テーブル (2024-2030)。");
tsLines.push(" * scripts/gen-holidays.mjs により生成。実行時に外部APIへは一切アクセスしない。");
tsLines.push(" * 振替休日・国民の休日を含む。天皇誕生日・春分の日・秋分の日等は");
tsLines.push(" * 内閣府官報公示前の年については国立天文台の近似計算式により算出した予測値。");
tsLines.push(" */");
tsLines.push("export interface HolidayEntry {");
tsLines.push("  date: string; // YYYY-MM-DD");
tsLines.push("  name: string;");
tsLines.push("}");
tsLines.push("");
tsLines.push("export const JAPAN_HOLIDAYS: HolidayEntry[] = [");
for (const h of all) {
  tsLines.push(`  { date: "${h.date}", name: "${h.name}" },`);
}
tsLines.push("];");
tsLines.push("");

process.stdout.write(tsLines.join("\n"));
