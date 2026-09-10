import { describe, expect, it } from "vitest";
import { buildGoogleCalendarTemplateUrl } from "../src/core/google/renderUrl";

describe("buildGoogleCalendarTemplateUrl", () => {
  it("終日予定は YYYYMMDD/YYYYMMDD 形式で終了日+1日になる", () => {
    const url = buildGoogleCalendarTemplateUrl({
      title: "会議",
      details: "",
      location: "",
      isAllDay: true,
      start: "2026-04-10",
      end: null,
    });
    const params = new URL(url).searchParams;
    expect(params.get("action")).toBe("TEMPLATE");
    expect(params.get("dates")).toBe("20260410/20260411");
  });

  it("複数日の終日予定は終了日(レコード上)+1日になる", () => {
    const url = buildGoogleCalendarTemplateUrl({
      title: "出張",
      details: "",
      location: "",
      isAllDay: true,
      start: "2026-04-10",
      end: "2026-04-12",
    });
    const params = new URL(url).searchParams;
    expect(params.get("dates")).toBe("20260410/20260413");
  });

  it("時刻付き予定は UTC の YYYYMMDDTHHmmssZ 形式になる", () => {
    const url = buildGoogleCalendarTemplateUrl({
      title: "打ち合わせ",
      details: "",
      location: "",
      isAllDay: false,
      start: "2026-04-10T10:00:00.000Z",
      end: "2026-04-10T11:30:00.000Z",
    });
    const params = new URL(url).searchParams;
    expect(params.get("dates")).toBe("20260410T100000Z/20260410T113000Z");
  });

  it("終了日時未指定の時刻付き予定は開始時刻と同じ end になる", () => {
    const url = buildGoogleCalendarTemplateUrl({
      title: "点イベント",
      details: "",
      location: "",
      isAllDay: false,
      start: "2026-04-10T10:00:00.000Z",
      end: null,
    });
    const params = new URL(url).searchParams;
    expect(params.get("dates")).toBe("20260410T100000Z/20260410T100000Z");
  });

  it("全パラメータがエンコードされ、details に改行を含むレコードリンクが付与される", () => {
    const url = buildGoogleCalendarTemplateUrl({
      title: "テスト & 予定",
      details: "詳細",
      location: "会議室 A",
      isAllDay: true,
      start: "2026-04-10",
      end: null,
      recordUrl: "https://example.cybozu.com/k/1/show#record=5",
    });
    expect(url).not.toContain(" ");
    expect(url).not.toContain("&予定"); // 生の & がそのまま入っていないこと
    const params = new URL(url).searchParams;
    expect(params.get("details")).toContain("https://example.cybozu.com/k/1/show#record=5");
    expect(params.get("location")).toBe("会議室 A");
  });

  it("details が長大な場合は安全に切り詰めつつレコードリンクを残す", () => {
    const longDetails = "あ".repeat(3000);
    const url = buildGoogleCalendarTemplateUrl({
      title: "長い予定",
      details: longDetails,
      location: "",
      isAllDay: true,
      start: "2026-04-10",
      end: null,
      recordUrl: "https://example.cybozu.com/k/1/show#record=99",
    });
    expect(url.length).toBeLessThanOrEqual(1950);
    const params = new URL(url).searchParams;
    expect(params.get("details")).toContain("https://example.cybozu.com/k/1/show#record=99");
  });
});
