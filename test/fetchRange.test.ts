import { describe, expect, it } from "vitest";

import { buildQuery, formatQueryValue } from "../src/core/data/fetch";
import { rangeWithLookback } from "../src/core/util/date";

/**
 * 実機で発生した不具合の回帰テスト。
 *
 * 2026年9月の月表示では、FullCalendar のグリッドは 8月30日(日) から始まる。
 * かつての実装は fetchInfo.start から「月」を取り出して取得期間を組み立てていたため、
 * 9月を表示しているのに 2026-07-25 〜 2026-09-08 を取得しており、
 * 9月9日以降のレコードが一切表示されなかった。
 */
describe("rangeWithLookback（表示範囲の決定）", () => {
  // 2026-09-01 は火曜のため、9月グリッドは 8/30 から 10/4 まで（end は排他的で 10/5）
  const visibleStart = new Date(2026, 7, 30);
  const visibleEnd = new Date(2026, 9, 5);

  it("表示範囲の終端をそのまま使う（月を推定し直さない）", () => {
    const { to } = rangeWithLookback(visibleStart, visibleEnd);
    expect(to.getTime()).toBe(visibleEnd.getTime());
  });

  it("9月23日のレコードが取得範囲に含まれる（旧実装では含まれなかった）", () => {
    const { from, to } = rangeWithLookback(visibleStart, visibleEnd);
    const record = new Date(2026, 8, 23, 1, 0);
    expect(record >= from).toBe(true);
    expect(record < to).toBe(true);
  });

  it("表示範囲の末日(10月4日)のレコードも含まれる", () => {
    const { from, to } = rangeWithLookback(visibleStart, visibleEnd);
    const record = new Date(2026, 9, 4, 23, 0);
    expect(record >= from).toBe(true);
    expect(record < to).toBe(true);
  });

  it("開始側は既定で62日遡り、範囲前から続く予定を拾える", () => {
    const { from } = rangeWithLookback(visibleStart, visibleEnd);
    expect(from.getTime()).toBe(new Date(2026, 5, 29).getTime());
  });

  it("遡り日数を指定できる", () => {
    const { from } = rangeWithLookback(visibleStart, visibleEnd, 7);
    expect(from.getTime()).toBe(new Date(2026, 7, 23).getTime());
  });
});

describe("formatQueryValue（kintone クエリの日時書式）", () => {
  const date = new Date(Date.UTC(2026, 7, 29, 15, 0, 0, 123));

  it("DATETIME 型は秒精度の ISO 8601（ミリ秒なし）", () => {
    expect(formatQueryValue(date, "DATETIME")).toBe("2026-08-29T15:00:00Z");
  });

  it("DATE 型は日付のみ", () => {
    expect(formatQueryValue(new Date(2026, 7, 29), "DATE")).toBe("2026-08-29");
  });

  it("型が不明な場合は DATETIME として扱う", () => {
    expect(formatQueryValue(date, undefined)).toBe("2026-08-29T15:00:00Z");
  });
});

describe("buildQuery", () => {
  const base = {
    appId: 105,
    dateFieldCode: "StartDateTime",
    from: new Date(Date.UTC(2026, 5, 29, 0, 0, 0)),
    to: new Date(Date.UTC(2026, 9, 4, 15, 0, 0)),
    extraCondition: "",
    viewCondition: null,
  };

  it("期間条件と並び順を組み立てる", () => {
    expect(buildQuery({ ...base, dateFieldType: "DATETIME" })).toBe(
      'StartDateTime >= "2026-06-29T00:00:00Z" and StartDateTime < "2026-10-04T15:00:00Z" order by StartDateTime asc'
    );
  });

  it("追加条件とビュー条件を括弧付きで連結する", () => {
    const query = buildQuery({
      ...base,
      dateFieldType: "DATETIME",
      extraCondition: 'Category in ("清掃")',
      viewCondition: 'IsRecurring in ("有効")',
    });
    expect(query).toContain('and (Category in ("清掃"))');
    expect(query).toContain('and (IsRecurring in ("有効"))');
  });

  it("ミリ秒を含まない（kintone のクエリ書式に合わせる）", () => {
    expect(buildQuery({ ...base, dateFieldType: "DATETIME" })).not.toContain(".000");
  });
});
