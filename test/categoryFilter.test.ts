import type { EventInput } from "@fullcalendar/core";
import { describe, expect, it } from "vitest";

import {
  collectCategories,
  filterEventsByCategory,
  type CategoryFilterState,
} from "../src/core/render/categoryFilter";
import { UNCATEGORIZED } from "../src/core/render/color";

function ev(id: string, category?: string): EventInput {
  return { id, extendedProps: category === undefined ? {} : { category } };
}

const events: EventInput[] = [
  ev("1", "理事会・総会"),
  ev("2", "清掃"),
  ev("3", "理事会・総会"),
  ev("4", UNCATEGORIZED),
  ev("5"),
];

describe("filterEventsByCategory", () => {
  it("all モードでは全件をそのまま返す", () => {
    const state: CategoryFilterState = { mode: "all" };
    expect(filterEventsByCategory(events, state)).toHaveLength(5);
  });

  it("単一カテゴリを選ぶとそのカテゴリのみ残る", () => {
    const state: CategoryFilterState = { mode: "some", values: new Set(["理事会・総会"]) };
    expect(filterEventsByCategory(events, state).map((e) => e.id)).toEqual(["1", "3"]);
  });

  it("複数カテゴリを選ぶといずれかに該当するものが残る", () => {
    const state: CategoryFilterState = { mode: "some", values: new Set(["理事会・総会", "清掃"]) };
    expect(filterEventsByCategory(events, state).map((e) => e.id)).toEqual(["1", "2", "3"]);
  });

  it("未設定を選ぶと category が空・未付与のものが残る", () => {
    const state: CategoryFilterState = { mode: "some", values: new Set([UNCATEGORIZED]) };
    expect(filterEventsByCategory(events, state).map((e) => e.id)).toEqual(["4", "5"]);
  });

  it("該当が無いカテゴリを選ぶと空になる", () => {
    const state: CategoryFilterState = { mode: "some", values: new Set(["存在しない"]) };
    expect(filterEventsByCategory(events, state)).toEqual([]);
  });
});

describe("collectCategories", () => {
  it("含まれるカテゴリを重複なく集める", () => {
    expect(collectCategories(events)).toEqual(new Set(["理事会・総会", "清掃", UNCATEGORIZED]));
  });

  it("空配列では空集合を返す", () => {
    expect(collectCategories([])).toEqual(new Set());
  });
});
