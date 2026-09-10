import type { EventInput } from "@fullcalendar/core";

import type { ColorRuleConfig } from "../config/schema";
import { UNCATEGORIZED } from "./color";

/**
 * 表示するカテゴリの状態。
 * - `all`: 全カテゴリを表示（初期状態）
 * - `some`: values に含まれるカテゴリのみ表示（UNCATEGORIZED は未設定値を表す）
 */
export type CategoryFilterState = { mode: "all" } | { mode: "some"; values: Set<string> };

export interface CategoryFilterController {
  /** カレンダーの上部に差し込む要素 */
  element: HTMLElement;
  /** 現在の絞り込み状態 */
  getState(): CategoryFilterState;
  /** 読み込まれたイベントに含まれるカテゴリを伝え、「未設定」チップの要否を同期する */
  syncPresentCategories(present: Set<string>): void;
}

const ALL_LABEL = "すべて表示";
const UNCATEGORIZED_LABEL = "未設定";

/**
 * カテゴリ色のチップを並べた絞り込み UI を構築する。
 * チップ自体が色と名称の対応を示すため、凡例の役割も兼ねる。
 *
 * 操作仕様:
 * - 全表示の状態でカテゴリをクリック → そのカテゴリのみ表示（単独表示）
 * - 絞り込み中に別のカテゴリをクリック → 表示対象に追加
 * - 選択中のカテゴリを再クリック → 解除（最後の1つを解除すると全表示に戻る）
 * - 「すべて表示」をクリック → 全表示に戻る
 */
export function buildCategoryFilter(
  colorRule: ColorRuleConfig,
  onChange: () => void
): CategoryFilterController {
  const container = document.createElement("div");
  container.className = "kcp-filter";

  const selected = new Set<string>();
  const chips = new Map<string, HTMLButtonElement>();

  if (colorRule.mapping.length === 0) {
    container.hidden = true;
    return {
      element: container,
      getState: () => ({ mode: "all" }),
      syncPresentCategories: () => {},
    };
  }

  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = "kcp-filter-chip kcp-filter-chip-all";
  allChip.textContent = ALL_LABEL;
  allChip.style.backgroundImage = buildRainbowGradient(colorRule);
  container.appendChild(allChip);

  for (const entry of colorRule.mapping) {
    container.appendChild(createChip(entry.value, entry.value, entry.backgroundColor, entry.textColor));
  }

  // 未設定値を持つレコードが読み込まれたときだけ表示するチップ。
  const uncategorizedChip = createChip(
    UNCATEGORIZED,
    UNCATEGORIZED_LABEL,
    colorRule.fallbackBackgroundColor,
    colorRule.fallbackTextColor
  );
  uncategorizedChip.hidden = true;
  container.appendChild(uncategorizedChip);

  allChip.addEventListener("click", () => {
    if (selected.size === 0) return;
    selected.clear();
    paint();
    onChange();
  });

  paint();

  return {
    element: container,
    getState: () => (selected.size === 0 ? { mode: "all" } : { mode: "some", values: new Set(selected) }),
    syncPresentCategories: (present) => {
      const hasUncategorized = present.has(UNCATEGORIZED);
      if (uncategorizedChip.hidden !== !hasUncategorized) {
        uncategorizedChip.hidden = !hasUncategorized;
      }
      // 表示されなくなったチップが選択されたままにならないようにする。
      if (!hasUncategorized && selected.delete(UNCATEGORIZED)) {
        paint();
        onChange();
      }
    },
  };

  function createChip(
    value: string,
    label: string,
    backgroundColor: string,
    textColor: string
  ): HTMLButtonElement {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "kcp-filter-chip";
    chip.textContent = label;
    chip.dataset["backgroundColor"] = backgroundColor;
    chip.dataset["textColor"] = textColor;
    chip.addEventListener("click", () => {
      if (selected.has(value)) {
        selected.delete(value);
      } else {
        selected.add(value);
      }
      paint();
      onChange();
    });
    chips.set(value, chip);
    return chip;
  }

  /** 選択状態をチップの見た目に反映する。 */
  function paint(): void {
    const isAll = selected.size === 0;

    allChip.classList.toggle("is-active", isAll);
    allChip.setAttribute("aria-pressed", String(isAll));

    for (const [value, chip] of chips) {
      const active = selected.has(value);
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
      if (active) {
        chip.style.backgroundColor = chip.dataset["backgroundColor"] ?? "";
        chip.style.color = chip.dataset["textColor"] ?? "";
        chip.style.borderColor = chip.dataset["backgroundColor"] ?? "";
      } else {
        chip.style.backgroundColor = "";
        chip.style.color = "";
        chip.style.borderColor = "";
      }
    }
  }
}

/** 「すべて表示」チップ用に、カテゴリ色を等分に並べたグラデーションを生成する。 */
function buildRainbowGradient(colorRule: ColorRuleConfig): string {
  const colors = colorRule.mapping.map((entry) => entry.backgroundColor);
  if (colors.length === 0) return "none";
  if (colors.length === 1) return `linear-gradient(90deg, ${colors[0]} 0%, ${colors[0]} 100%)`;

  const step = 100 / colors.length;
  const stops = colors.map((color, index) => {
    const from = (step * index).toFixed(2);
    const to = (step * (index + 1)).toFixed(2);
    return `${color} ${from}%, ${color} ${to}%`;
  });
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/** イベントに付与されたカテゴリ値を取り出す。未設定は UNCATEGORIZED を返す。 */
function eventCategory(event: EventInput): string {
  return (event.extendedProps?.["category"] as string | undefined) ?? UNCATEGORIZED;
}

/** 絞り込み状態に従って表示するイベントを選別する。 */
export function filterEventsByCategory(events: EventInput[], state: CategoryFilterState): EventInput[] {
  if (state.mode === "all") return events;
  return events.filter((event) => state.values.has(eventCategory(event)));
}

/** 読み込まれたイベントに含まれるカテゴリ値を集める。 */
export function collectCategories(events: EventInput[]): Set<string> {
  const present = new Set<string>();
  for (const event of events) {
    present.add(eventCategory(event));
  }
  return present;
}
