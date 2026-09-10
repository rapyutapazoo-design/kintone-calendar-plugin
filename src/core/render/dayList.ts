import type { EventApi } from "@fullcalendar/core";
import { expandTemplate, type FieldSchemaLookup } from "../template/parse";
import type { KintoneFieldValue } from "../util/typeGuards";

export interface DayListDeps {
  fieldSchema: FieldSchemaLookup;
  templateString: string;
  onSelect: (recordId: string, record: Record<string, KintoneFieldValue>, el: HTMLElement) => void;
}

/**
 * モバイル用: 日付タップでその日の予定を一覧表示するパネル（listDay 相当）を構築する。
 * 横スクロールが発生しないよう、テキストは折り返しで表示する。
 */
export function buildDayListPanel(dateLabel: string, events: EventApi[], deps: DayListDeps): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "kcp-day-list-panel";

  const heading = document.createElement("div");
  heading.className = "kcp-day-list-heading";
  heading.textContent = dateLabel;
  panel.appendChild(heading);

  if (events.length === 0) {
    const empty = document.createElement("div");
    empty.className = "kcp-day-list-empty";
    empty.textContent = "予定はありません";
    panel.appendChild(empty);
    return panel;
  }

  const ul = document.createElement("ul");
  ul.className = "kcp-day-list";

  for (const event of events) {
    const record = event.extendedProps["record"] as Record<string, KintoneFieldValue>;
    const recordId = String(event.extendedProps["recordId"] ?? "");
    const { text } = expandTemplate(deps.templateString, record, deps.fieldSchema);

    const li = document.createElement("li");
    li.className = "kcp-day-list-item";
    li.style.borderLeftColor = String(event.backgroundColor || "#3788d8");
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.textContent = text || recordId;

    const handler = (): void => {
      if (recordId) deps.onSelect(recordId, record, li);
    };
    li.addEventListener("click", handler);
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler();
      }
    });

    ul.appendChild(li);
  }

  panel.appendChild(ul);
  return panel;
}
