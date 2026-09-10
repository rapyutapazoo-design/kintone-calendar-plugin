import { exportConfigToJson, importConfigFromJson } from "../core/config/exportImport";
import { loadPluginConfig } from "../core/config/load";
import { buildSampleRecord } from "../core/config/preview";
import { createDefaultConfig, type ColorMappingEntry, type PluginConfig } from "../core/config/schema";
import { validateConfig, type ValidationIssue } from "../core/config/validate";
import {
  CATEGORY_FIELD_TYPES,
  DATE_FIELD_TYPES,
  createFieldSchemaLookup,
  fetchFieldMeta,
  type FieldMetaMap,
} from "../core/data/fields";
import { expandTemplate } from "../core/template/parse";
import { resolveEventColor } from "../core/render/color";
import { getApiClient } from "../core/util/kintoneApi";
import { readPluginConfig } from "../core/util/pluginId";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fieldOptions(
  fieldMeta: FieldMetaMap,
  allowedTypes: string[] | null
): { code: string; label: string }[] {
  return Object.entries(fieldMeta)
    .filter(([, meta]) => !allowedTypes || allowedTypes.includes(meta.type))
    .map(([code, meta]) => ({ code, label: `${meta.label || code} (${code})` }));
}

function buildSelect(
  options: { code: string; label: string }[],
  includeEmpty: boolean,
  selected: string | null,
  onChange: (value: string) => void
): HTMLSelectElement {
  const select = el("select");
  if (includeEmpty) {
    const opt = el("option", undefined, "（なし）");
    opt.value = "";
    select.appendChild(opt);
  }
  for (const o of options) {
    const opt = el("option", undefined, o.label);
    opt.value = o.code;
    if (o.code === selected) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function row(labelText: string, control: HTMLElement): HTMLElement {
  const wrapper = el("div", "kcp-config-row");
  const label = el("label", undefined, labelText);
  wrapper.appendChild(label);
  wrapper.appendChild(control);
  return wrapper;
}

function section(title: string): HTMLElement {
  const s = el("section", "kcp-config-section");
  s.appendChild(el("h2", undefined, title));
  return s;
}

/**
 * 設定フォームの描画先を得る。config.html の断片が想定通り挿入されなかった場合でも
 * 画面が無言で空白になることを避けるため、無ければ body 直下に生成する。
 */
function resolveConfigRoot(): HTMLElement {
  const existing = document.getElementById("kcp-config-root");
  if (existing) return existing;

  const created = document.createElement("div");
  created.id = "kcp-config-root";
  document.body.appendChild(created);
  return created;
}

async function main(): Promise<void> {
  const root = resolveConfigRoot();

  const appId = kintone.app.getId();
  if (appId === null) {
    root.appendChild(el("p", undefined, "アプリ情報を取得できませんでした。"));
    return;
  }

  const api = getApiClient();
  let fieldMeta: FieldMetaMap;
  try {
    fieldMeta = await fetchFieldMeta(api, appId, true);
  } catch {
    root.appendChild(el("p", undefined, "フィールド情報の取得に失敗しました。時間をおいて再度お試しください。"));
    return;
  }

  const rawConfig = readPluginConfig();
  if (!rawConfig) {
    root.appendChild(
      el(
        "p",
        "kcp-issue-error",
        "プラグイン ID を取得できなかったため、設定を読み込めませんでした。プラグインを再インポートしてから、もう一度お試しください。"
      )
    );
    return;
  }

  const loaded = loadPluginConfig(rawConfig);
  const config: PluginConfig = loaded.ok ? loaded.config : createDefaultConfig();

  renderForm(root, appId, fieldMeta, config);
}

function renderForm(root: HTMLElement, appId: number, fieldMeta: FieldMetaMap, initial: PluginConfig): void {
  // 作業用ステート（保存ボタン押下時にまとめてバリデーション・保存する）
  const state: PluginConfig = JSON.parse(JSON.stringify(initial));
  const fieldSchema = createFieldSchemaLookup(fieldMeta);

  const dateTypeOptions = fieldOptions(fieldMeta, DATE_FIELD_TYPES);
  const categoryTypeOptions = fieldOptions(fieldMeta, CATEGORY_FIELD_TYPES);
  const allFieldOptions = fieldOptions(fieldMeta, null);

  root.appendChild(buildDateMappingSection(state, dateTypeOptions));
  root.appendChild(buildBandTemplateSection(state, allFieldOptions, () => refreshPreview()));
  const colorSection = buildColorRuleSection(state, categoryTypeOptions, fieldMeta, () => refreshPreview());
  root.appendChild(colorSection);
  root.appendChild(buildDisplaySection(state));
  root.appendChild(buildDataSourceSection(state));
  root.appendChild(buildGoogleSection(state, allFieldOptions));

  const previewSection = section("プレビュー");
  const previewBox = el("div", "kcp-preview-box");
  previewSection.appendChild(previewBox);
  root.appendChild(previewSection);

  function refreshPreview(): void {
    while (previewBox.firstChild) previewBox.removeChild(previewBox.firstChild);
    const sampleRecord = buildSampleRecord(fieldMeta);
    for (const [label, layout] of [
      ["PC", "desktop"],
      ["モバイル", "mobile"],
    ] as const) {
      const template = layout === "mobile" && state.bandTemplate.mobileTemplate
        ? state.bandTemplate.mobileTemplate
        : state.bandTemplate.template;
      const { text } = expandTemplate(template, sampleRecord, fieldSchema);
      const color = resolveEventColor(sampleRecord, state.colorRule);

      const card = el("div", "kcp-preview-card");
      card.appendChild(el("div", undefined, label));
      const band = el("div", "kcp-preview-band", text || "(空)");
      band.style.backgroundColor = color.backgroundColor;
      band.style.color = color.textColor;
      card.appendChild(band);
      previewBox.appendChild(card);
    }
  }
  refreshPreview();

  const importExportSection = buildImportExportSection(state, fieldMeta, () => {
    // インポート成功時は画面を作り直す
    while (root.firstChild) root.removeChild(root.firstChild);
    renderForm(root, appId, fieldMeta, state);
  });
  root.appendChild(importExportSection);

  const statusBox = el("div", "kcp-config-status");
  root.appendChild(statusBox);

  const actions = el("div", "kcp-config-actions");
  const saveButton = el("button", "kcp-button-primary", "保存");
  saveButton.type = "button";
  actions.appendChild(saveButton);
  root.appendChild(actions);

  saveButton.addEventListener("click", () => {
    const fieldExists = (code: string): boolean => code in fieldMeta;
    const issues = validateConfig(state, fieldExists);
    renderIssues(statusBox, issues);

    const hasError = issues.some((i) => i.severity === "error");
    if (hasError) return;

    kintone.plugin.app.setConfig({ config: JSON.stringify(state) }, () => {
      statusBox.textContent = "";
      statusBox.appendChild(el("p", undefined, "設定を保存しました。アプリの設定画面に戻り、運用を開始してください。"));
    });
  });
}

function renderIssues(container: HTMLElement, issues: ValidationIssue[]): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (issues.length === 0) return;
  const ul = el("ul", "kcp-issue-list");
  for (const issue of issues) {
    const li = el("li", issue.severity === "error" ? "kcp-issue-error" : "kcp-issue-warning", issue.message);
    ul.appendChild(li);
  }
  container.appendChild(ul);
}

function buildDateMappingSection(
  state: PluginConfig,
  dateTypeOptions: { code: string; label: string }[]
): HTMLElement {
  const s = section("日付マッピング");
  s.appendChild(
    row(
      "開始日時フィールド（必須）",
      buildSelect(dateTypeOptions, true, state.dateMapping.startFieldCode, (v) => {
        state.dateMapping.startFieldCode = v;
      })
    )
  );
  s.appendChild(
    row(
      "終了日時フィールド（任意）",
      buildSelect(dateTypeOptions, true, state.dateMapping.endFieldCode, (v) => {
        state.dateMapping.endFieldCode = v || null;
      })
    )
  );
  return s;
}

function buildBandTemplateSection(
  state: PluginConfig,
  allFieldOptions: { code: string; label: string }[],
  onChange: () => void
): HTMLElement {
  const s = section("帯の表示内容");

  const modeSelect = el("select");
  for (const [value, label] of [
    ["list", "選択リスト（既定）"],
    ["template", "テンプレート文字列（詳細設定）"],
  ] as const) {
    const opt = el("option", undefined, label);
    opt.value = value;
    if (value === state.bandTemplate.mode) opt.selected = true;
    modeSelect.appendChild(opt);
  }
  s.appendChild(row("編集モード", modeSelect));

  const listArea = el("div");
  const templateArea = el("div");

  const templateTextarea = el("textarea") as HTMLTextAreaElement;
  templateTextarea.value = state.bandTemplate.template;
  templateTextarea.placeholder = "例: {title} / {category}";
  templateTextarea.addEventListener("input", () => {
    state.bandTemplate.template = templateTextarea.value;
    onChange();
  });
  templateArea.appendChild(row("PC 用テンプレート文字列", templateTextarea));

  const mobileTextarea = el("textarea") as HTMLTextAreaElement;
  mobileTextarea.value = state.bandTemplate.mobileTemplate ?? "";
  mobileTextarea.placeholder = "未入力の場合は PC 用テンプレートを使用します";
  mobileTextarea.addEventListener("input", () => {
    state.bandTemplate.mobileTemplate = mobileTextarea.value || null;
    onChange();
  });
  templateArea.appendChild(row("モバイル用テンプレート文字列（任意）", mobileTextarea));

  function rebuildListArea(): void {
    while (listArea.firstChild) listArea.removeChild(listArea.firstChild);

    const addSelect = buildSelect(
      allFieldOptions.filter((o) => !state.bandTemplate.listFieldCodes.includes(o.code)),
      true,
      null,
      (v) => {
        if (!v) return;
        state.bandTemplate.listFieldCodes.push(v);
        syncTemplateFromList();
        rebuildListArea();
      }
    );
    listArea.appendChild(row("フィールドを追加", addSelect));

    const ul = el("ul");
    ul.style.listStyle = "none";
    ul.style.padding = "0";

    state.bandTemplate.listFieldCodes.forEach((code, index) => {
      const li = el("li");
      li.style.display = "flex";
      li.style.alignItems = "center";
      li.style.gap = "6px";
      li.style.marginBottom = "4px";

      const meta = allFieldOptions.find((o) => o.code === code);
      li.appendChild(el("span", undefined, meta ? meta.label : code));

      const upBtn = el("button", "kcp-button-secondary", "↑");
      upBtn.type = "button";
      upBtn.disabled = index === 0;
      upBtn.addEventListener("click", () => {
        const list = state.bandTemplate.listFieldCodes;
        [list[index - 1], list[index]] = [list[index]!, list[index - 1]!];
        syncTemplateFromList();
        rebuildListArea();
      });

      const downBtn = el("button", "kcp-button-secondary", "↓");
      downBtn.type = "button";
      downBtn.disabled = index === state.bandTemplate.listFieldCodes.length - 1;
      downBtn.addEventListener("click", () => {
        const list = state.bandTemplate.listFieldCodes;
        [list[index], list[index + 1]] = [list[index + 1]!, list[index]!];
        syncTemplateFromList();
        rebuildListArea();
      });

      const removeBtn = el("button", "kcp-button-secondary", "削除");
      removeBtn.type = "button";
      removeBtn.addEventListener("click", () => {
        state.bandTemplate.listFieldCodes.splice(index, 1);
        syncTemplateFromList();
        rebuildListArea();
      });

      li.appendChild(upBtn);
      li.appendChild(downBtn);
      li.appendChild(removeBtn);
      ul.appendChild(li);
    });

    listArea.appendChild(ul);
  }

  function syncTemplateFromList(): void {
    // 選択リストモードでは内部表現をテンプレート文字列へ変換して一本化する。
    state.bandTemplate.template = state.bandTemplate.listFieldCodes.map((c) => `{${c}}`).join(" / ");
    templateTextarea.value = state.bandTemplate.template;
    onChange();
  }

  function applyModeVisibility(): void {
    listArea.style.display = state.bandTemplate.mode === "list" ? "" : "none";
    templateArea.style.display = state.bandTemplate.mode === "template" ? "" : "none";
  }

  modeSelect.addEventListener("change", () => {
    state.bandTemplate.mode = modeSelect.value as "list" | "template";
    applyModeVisibility();
  });

  rebuildListArea();
  applyModeVisibility();

  s.appendChild(listArea);
  s.appendChild(templateArea);
  return s;
}

function buildColorRuleSection(
  state: PluginConfig,
  categoryTypeOptions: { code: string; label: string }[],
  fieldMeta: FieldMetaMap,
  onChange: () => void
): HTMLElement {
  const s = section("色分け");

  const mappingArea = el("div");

  function rebuildMappingArea(): void {
    while (mappingArea.firstChild) mappingArea.removeChild(mappingArea.firstChild);

    const meta = state.colorRule.categoryFieldCode ? fieldMeta[state.colorRule.categoryFieldCode] : undefined;
    const optionLabels = meta?.options ? Object.keys(meta.options) : [];

    for (const value of optionLabels) {
      let entry = state.colorRule.mapping.find((m) => m.value === value);
      if (!entry) {
        entry = { value, backgroundColor: "#3788d8", textColor: "#ffffff" };
        state.colorRule.mapping.push(entry);
      }

      const currentEntry = entry;
      const wrapper = el("div", "kcp-color-row");
      wrapper.appendChild(el("span", undefined, value));

      const bgInput = el("input") as HTMLInputElement;
      bgInput.type = "color";
      bgInput.value = currentEntry.backgroundColor;
      bgInput.addEventListener("input", () => {
        currentEntry.backgroundColor = bgInput.value;
        onChange();
      });

      const textInput = el("input") as HTMLInputElement;
      textInput.type = "color";
      textInput.value = currentEntry.textColor;
      textInput.addEventListener("input", () => {
        currentEntry.textColor = textInput.value;
        onChange();
      });

      wrapper.appendChild(el("span", undefined, "背景"));
      wrapper.appendChild(bgInput);
      wrapper.appendChild(el("span", undefined, "文字"));
      wrapper.appendChild(textInput);
      mappingArea.appendChild(wrapper);
    }

    // 選択肢に存在しなくなった値のマッピングは除去する
    state.colorRule.mapping = state.colorRule.mapping.filter((m) => optionLabels.includes(m.value));
  }

  s.appendChild(
    row(
      "カテゴリフィールド",
      buildSelect(categoryTypeOptions, true, state.colorRule.categoryFieldCode, (v) => {
        state.colorRule.categoryFieldCode = v || null;
        rebuildMappingArea();
        onChange();
      })
    )
  );

  s.appendChild(mappingArea);
  rebuildMappingArea();

  const fallbackBg = el("input") as HTMLInputElement;
  fallbackBg.type = "color";
  fallbackBg.value = state.colorRule.fallbackBackgroundColor;
  fallbackBg.addEventListener("input", () => {
    state.colorRule.fallbackBackgroundColor = fallbackBg.value;
    onChange();
  });
  s.appendChild(row("フォールバック背景色", fallbackBg));

  const fallbackText = el("input") as HTMLInputElement;
  fallbackText.type = "color";
  fallbackText.value = state.colorRule.fallbackTextColor;
  fallbackText.addEventListener("input", () => {
    state.colorRule.fallbackTextColor = fallbackText.value;
    onChange();
  });
  s.appendChild(row("フォールバック文字色", fallbackText));

  return s;
}

function buildDisplaySection(state: PluginConfig): HTMLElement {
  const s = section("表示設定");

  const firstDaySelect = el("select");
  for (const [value, label] of [
    ["0", "日曜"],
    ["1", "月曜"],
  ] as const) {
    const opt = el("option", undefined, label);
    opt.value = value;
    if (Number(value) === state.display.firstDay) opt.selected = true;
    firstDaySelect.appendChild(opt);
  }
  firstDaySelect.addEventListener("change", () => {
    state.display.firstDay = Number(firstDaySelect.value);
  });
  s.appendChild(row("週開始曜日", firstDaySelect));

  const holidayCheckbox = el("input") as HTMLInputElement;
  holidayCheckbox.type = "checkbox";
  holidayCheckbox.checked = state.display.showHolidays;
  holidayCheckbox.addEventListener("change", () => {
    state.display.showHolidays = holidayCheckbox.checked;
  });
  s.appendChild(row("祝日表示", holidayCheckbox));

  const maxEventsInput = el("input") as HTMLInputElement;
  maxEventsInput.type = "text";
  maxEventsInput.value = String(state.display.maxEventsPerDay);
  maxEventsInput.addEventListener("input", () => {
    const n = parseInt(maxEventsInput.value, 10);
    state.display.maxEventsPerDay = Number.isFinite(n) && n > 0 ? n : state.display.maxEventsPerDay;
  });
  s.appendChild(row("1セル最大表示件数", maxEventsInput));

  const defaultToggleSelect = el("select");
  for (const [value, label] of [
    ["calendar", "カレンダー"],
    ["list", "一覧"],
  ] as const) {
    const opt = el("option", undefined, label);
    opt.value = value;
    if (value === state.display.defaultToggleState) opt.selected = true;
    defaultToggleSelect.appendChild(opt);
  }
  defaultToggleSelect.addEventListener("change", () => {
    state.display.defaultToggleState = defaultToggleSelect.value as "calendar" | "list";
  });
  s.appendChild(row("トグルの既定値", defaultToggleSelect));

  const legendCheckbox = el("input") as HTMLInputElement;
  legendCheckbox.type = "checkbox";
  legendCheckbox.checked = state.display.showLegend;
  legendCheckbox.addEventListener("change", () => {
    state.display.showLegend = legendCheckbox.checked;
  });
  s.appendChild(row("凡例表示", legendCheckbox));

  return s;
}

function buildDataSourceSection(state: PluginConfig): HTMLElement {
  const s = section("データ設定");

  const extraInput = el("input") as HTMLInputElement;
  extraInput.type = "text";
  extraInput.value = state.dataSource.extraQueryCondition;
  extraInput.placeholder = '例: ステータス not in ("完了")';
  extraInput.addEventListener("input", () => {
    state.dataSource.extraQueryCondition = extraInput.value;
  });
  s.appendChild(row("追加絞込条件", extraInput));

  const inheritCheckbox = el("input") as HTMLInputElement;
  inheritCheckbox.type = "checkbox";
  inheritCheckbox.checked = state.dataSource.inheritViewCondition;
  inheritCheckbox.addEventListener("change", () => {
    state.dataSource.inheritViewCondition = inheritCheckbox.checked;
  });
  s.appendChild(row("一覧ビューの絞込条件を引き継ぐ", inheritCheckbox));

  return s;
}

function buildGoogleSection(
  state: PluginConfig,
  allFieldOptions: { code: string; label: string }[]
): HTMLElement {
  const s = section("Google カレンダー連携");

  const enabledCheckbox = el("input") as HTMLInputElement;
  enabledCheckbox.type = "checkbox";
  enabledCheckbox.checked = state.googleIntegration.enabled;
  enabledCheckbox.addEventListener("change", () => {
    state.googleIntegration.enabled = enabledCheckbox.checked;
  });
  s.appendChild(row("Google カレンダー連携を有効にする", enabledCheckbox));

  const titleTextarea = el("textarea") as HTMLTextAreaElement;
  titleTextarea.value = state.googleIntegration.titleTemplate;
  titleTextarea.addEventListener("input", () => {
    state.googleIntegration.titleTemplate = titleTextarea.value;
  });
  s.appendChild(row("予定タイトル用テンプレート", titleTextarea));

  const detailsTextarea = el("textarea") as HTMLTextAreaElement;
  detailsTextarea.value = state.googleIntegration.detailsTemplate;
  detailsTextarea.addEventListener("input", () => {
    state.googleIntegration.detailsTemplate = detailsTextarea.value;
  });
  s.appendChild(row("説明欄用テンプレート", detailsTextarea));

  s.appendChild(
    row(
      "場所フィールド",
      buildSelect(allFieldOptions, true, state.googleIntegration.locationFieldCode, (v) => {
        state.googleIntegration.locationFieldCode = v || null;
      })
    )
  );

  const appendLinkCheckbox = el("input") as HTMLInputElement;
  appendLinkCheckbox.type = "checkbox";
  appendLinkCheckbox.checked = state.googleIntegration.appendRecordLink;
  appendLinkCheckbox.addEventListener("change", () => {
    state.googleIntegration.appendRecordLink = appendLinkCheckbox.checked;
  });
  s.appendChild(row("説明欄末尾にレコードへのリンクを付与する", appendLinkCheckbox));

  return s;
}

function buildImportExportSection(
  state: PluginConfig,
  fieldMeta: FieldMetaMap,
  onImported: () => void
): HTMLElement {
  const s = section("設定のエクスポート／インポート");

  const exportButton = el("button", "kcp-button-secondary", "エクスポート");
  exportButton.type = "button";
  const exportArea = el("textarea") as HTMLTextAreaElement;
  exportArea.readOnly = true;
  exportArea.style.minHeight = "120px";
  exportArea.hidden = true;

  exportButton.addEventListener("click", () => {
    exportArea.value = exportConfigToJson(state);
    exportArea.hidden = false;
    exportArea.focus();
    exportArea.select();
  });

  const importTextarea = el("textarea") as HTMLTextAreaElement;
  importTextarea.placeholder = "エクスポートした設定 JSON を貼り付けてください";

  const importButton = el("button", "kcp-button-secondary", "インポート");
  importButton.type = "button";

  const issueBox = el("div");

  importButton.addEventListener("click", () => {
    const fieldExists = (code: string): boolean => code in fieldMeta;
    const result = importConfigFromJson(importTextarea.value, fieldExists);
    renderIssues(issueBox, result.issues);
    if (result.config) {
      Object.assign(state, result.config);
      onImported();
    }
  });

  s.appendChild(row("エクスポート（クリップボードにコピーしてご利用ください）", exportButton));
  s.appendChild(exportArea);
  s.appendChild(row("インポートする設定 JSON", importTextarea));
  s.appendChild(importButton);
  s.appendChild(issueBox);

  return s;
}

main();
