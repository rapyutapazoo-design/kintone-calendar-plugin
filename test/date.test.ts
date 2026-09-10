import { describe, expect, it } from "vitest";
import { addDays, bufferedMonthRange, computeEventPeriod, parseDateOnly, toDateOnlyString } from "../src/core/util/date";

describe("computeEventPeriod (終日イベント)", () => {
  it("単日の終日イベントは end が開始日+1日になる（排他的End補正）", () => {
    const period = computeEventPeriod({ isAllDay: true, start: "2026-04-10", end: null });
    expect(toDateOnlyString(period.start)).toBe("2026-04-10");
    expect(toDateOnlyString(period.end)).toBe("2026-04-11");
    expect(period.allDay).toBe(true);
  });

  it("複数日の終日イベントは終了日+1日を end とする", () => {
    const period = computeEventPeriod({ isAllDay: true, start: "2026-04-10", end: "2026-04-12" });
    expect(toDateOnlyString(period.start)).toBe("2026-04-10");
    expect(toDateOnlyString(period.end)).toBe("2026-04-13");
  });

  it("月末をまたぐ終日イベント（4/30始まり5/2終わり）", () => {
    const period = computeEventPeriod({ isAllDay: true, start: "2026-04-30", end: "2026-05-02" });
    expect(toDateOnlyString(period.start)).toBe("2026-04-30");
    expect(toDateOnlyString(period.end)).toBe("2026-05-03");
  });

  it("月初をまたぐ終日イベント（1/31始まり2/1終わり）のうるう年考慮", () => {
    const period = computeEventPeriod({ isAllDay: true, start: "2028-01-31", end: "2028-02-01" });
    expect(toDateOnlyString(period.start)).toBe("2028-01-31");
    expect(toDateOnlyString(period.end)).toBe("2028-02-02");
  });

  it("年をまたぐ終日イベント（12/30始まり1/1終わり）", () => {
    const period = computeEventPeriod({ isAllDay: true, start: "2026-12-30", end: "2027-01-01" });
    expect(toDateOnlyString(period.start)).toBe("2026-12-30");
    expect(toDateOnlyString(period.end)).toBe("2027-01-02");
  });

  it("2月末（うるう年でない）をまたぐイベント", () => {
    const period = computeEventPeriod({ isAllDay: true, start: "2027-02-27", end: "2027-03-01" });
    expect(toDateOnlyString(period.start)).toBe("2027-02-27");
    expect(toDateOnlyString(period.end)).toBe("2027-03-02");
  });
});

describe("computeEventPeriod (時刻付きイベント)", () => {
  it("終了日時が設定されている場合はそのまま end とする（補正なし）", () => {
    const period = computeEventPeriod({
      isAllDay: false,
      start: "2026-04-10T10:00:00.000Z",
      end: "2026-04-10T11:30:00.000Z",
    });
    expect(period.start.toISOString()).toBe("2026-04-10T10:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-04-10T11:30:00.000Z");
    expect(period.allDay).toBe(false);
  });

  it("終了日時が未設定の場合は開始時刻と同一の end になる（点イベント）", () => {
    const period = computeEventPeriod({ isAllDay: false, start: "2026-04-10T10:00:00.000Z", end: null });
    expect(period.end.toISOString()).toBe(period.start.toISOString());
  });

  it("時刻付き複数日イベント（月またぎ）", () => {
    const period = computeEventPeriod({
      isAllDay: false,
      start: "2026-04-30T23:00:00.000Z",
      end: "2026-05-01T02:00:00.000Z",
    });
    expect(period.start.toISOString()).toBe("2026-04-30T23:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-05-01T02:00:00.000Z");
  });
});

describe("addDays / parseDateOnly / toDateOnlyString", () => {
  it("月末から加算すると翌月にロールオーバーする", () => {
    const result = addDays(parseDateOnly("2026-01-31"), 1);
    expect(toDateOnlyString(result)).toBe("2026-02-01");
  });

  it("年末から加算すると翌年にロールオーバーする", () => {
    const result = addDays(parseDateOnly("2026-12-31"), 1);
    expect(toDateOnlyString(result)).toBe("2027-01-01");
  });

  it("うるう年の2/29から加算", () => {
    const result = addDays(parseDateOnly("2028-02-29"), 1);
    expect(toDateOnlyString(result)).toBe("2028-03-01");
  });
});

describe("bufferedMonthRange", () => {
  it("月初・月末にバッファを取った範囲を返す（1月）", () => {
    const { from, to } = bufferedMonthRange(2026, 0, 7);
    expect(toDateOnlyString(from)).toBe("2025-12-25");
    expect(toDateOnlyString(to)).toBe("2026-02-08");
  });

  it("年をまたぐ月（12月）でも正しく計算される", () => {
    const { from, to } = bufferedMonthRange(2026, 11, 7);
    expect(toDateOnlyString(from)).toBe("2026-11-24");
    expect(toDateOnlyString(to)).toBe("2027-01-08");
  });
});
