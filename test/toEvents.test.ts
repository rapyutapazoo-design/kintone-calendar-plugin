import { describe, expect, it } from "vitest";
import { recordsToEvents } from "../src/core/render/toEvents";
import type { DateMappingConfig } from "../src/core/config/schema";

function record(fields: Record<string, unknown>): Record<string, { type: string; value: unknown }> {
  const out: Record<string, { type: string; value: unknown }> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = { type: "SINGLE_LINE_TEXT", value: v };
  }
  return out;
}

const dateMapping: DateMappingConfig = { startFieldCode: "start", endFieldCode: "end" };

describe("recordsToEvents", () => {
  it("開始日時が空のレコードは除外され件数が返る", () => {
    const records = [record({ $id: "1", start: "", end: "" }), record({ $id: "2", start: "2026-04-10", end: "" })];
    const { events, excludedCount } = recordsToEvents(records, dateMapping, () => "DATE");
    expect(excludedCount).toBe(1);
    expect(events).toHaveLength(1);
  });

  it("開始日時が不正な文字列のレコードは除外される", () => {
    const records = [record({ $id: "1", start: "not-a-date", end: "" })];
    const { events, excludedCount } = recordsToEvents(records, dateMapping, () => "DATE");
    expect(excludedCount).toBe(1);
    expect(events).toHaveLength(0);
  });

  it("DATE 型フィールドは終日イベントとして変換される", () => {
    const records = [record({ $id: "1", start: "2026-04-10", end: "" })];
    const { events } = recordsToEvents(records, dateMapping, () => "DATE");
    expect(events[0]!.allDay).toBe(true);
  });

  it("DATETIME 型フィールドは時刻付きイベントとして変換される", () => {
    const records = [record({ $id: "1", start: "2026-04-10T10:00:00Z", end: "" })];
    const { events } = recordsToEvents(records, dateMapping, () => "DATETIME");
    expect(events[0]!.allDay).toBe(false);
  });

  it("終了日時フィールド未指定 (endFieldCode: null) でも動作する", () => {
    const mapping: DateMappingConfig = { startFieldCode: "start", endFieldCode: null };
    const records = [record({ $id: "1", start: "2026-04-10" })];
    const { events } = recordsToEvents(records, mapping, () => "DATE");
    expect(events).toHaveLength(1);
  });
});
