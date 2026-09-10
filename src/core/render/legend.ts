import type { ColorRuleConfig } from "../config/schema";

/**
 * 色と選択肢名の対応を示す凡例を構築する。表示可否は呼び出し側で
 * config.display.showLegend を見て判断する。モバイルでは折りたたみ可能にする。
 */
export function buildLegend(colorRule: ColorRuleConfig, collapsible: boolean): HTMLElement {
  const container = document.createElement("div");
  container.className = "kcp-legend";

  if (colorRule.mapping.length === 0) {
    container.hidden = true;
    return container;
  }

  let list: HTMLElement = container;

  if (collapsible) {
    const details = document.createElement("details");
    details.className = "kcp-legend-details";
    const summary = document.createElement("summary");
    summary.textContent = "凡例";
    details.appendChild(summary);
    container.appendChild(details);
    list = details;
  }

  const ul = document.createElement("ul");
  ul.className = "kcp-legend-list";

  for (const entry of colorRule.mapping) {
    const li = document.createElement("li");
    li.className = "kcp-legend-item";

    const swatch = document.createElement("span");
    swatch.className = "kcp-legend-swatch";
    swatch.style.backgroundColor = entry.backgroundColor;
    swatch.style.color = entry.textColor;

    const label = document.createElement("span");
    label.className = "kcp-legend-label";
    label.textContent = entry.value;

    li.appendChild(swatch);
    li.appendChild(label);
    ul.appendChild(li);
  }

  list.appendChild(ul);
  return container;
}
