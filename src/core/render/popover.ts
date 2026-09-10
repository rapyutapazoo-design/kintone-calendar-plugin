import { createGoogleCalendarLink } from "../google/button";

export interface PopoverContent {
  bandText: string;
  detailFields: { label: string; value: string }[];
  periodText: string;
  categoryText: string | null;
  openRecordUrl: string;
  googleUrl: string | null;
}

export interface PopoverHandle {
  close: () => void;
}

/**
 * PC 用ポップオーバー。帯クリックで対象の帯にアンカーされた形で表示する。
 * 画面端でのはみ出し回避、Esc キー・外側クリックで閉じる、フォーカストラップに対応する。
 */
export function showPopover(anchorEl: HTMLElement, content: PopoverContent): PopoverHandle {
  const overlay = document.createElement("div");
  overlay.className = "kcp-popover-overlay";

  const popover = document.createElement("div");
  popover.className = "kcp-popover";
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-modal", "true");
  popover.tabIndex = -1;

  const bandTitle = document.createElement("div");
  bandTitle.className = "kcp-popover-title";
  bandTitle.textContent = content.bandText;
  popover.appendChild(bandTitle);

  const period = document.createElement("div");
  period.className = "kcp-popover-period";
  period.textContent = content.periodText;
  popover.appendChild(period);

  if (content.categoryText) {
    const category = document.createElement("div");
    category.className = "kcp-popover-category";
    category.textContent = content.categoryText;
    popover.appendChild(category);
  }

  if (content.detailFields.length > 0) {
    const dl = document.createElement("dl");
    dl.className = "kcp-popover-fields";
    for (const field of content.detailFields) {
      const dt = document.createElement("dt");
      dt.textContent = field.label;
      const dd = document.createElement("dd");
      dd.textContent = field.value;
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    popover.appendChild(dl);
  }

  const actions = document.createElement("div");
  actions.className = "kcp-popover-actions";

  const openButton = document.createElement("a");
  openButton.href = content.openRecordUrl;
  openButton.className = "kcp-popover-open-button";
  openButton.textContent = "レコードを開く";
  actions.appendChild(openButton);

  if (content.googleUrl) {
    actions.appendChild(createGoogleCalendarLink(content.googleUrl));
  }

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "kcp-popover-close-button";
  closeButton.textContent = "閉じる";
  actions.appendChild(closeButton);

  popover.appendChild(actions);
  overlay.appendChild(popover);
  document.body.appendChild(overlay);

  positionPopover(popover, anchorEl);

  const focusableSelector = "a[href], button, [tabindex]:not([tabindex='-1'])";

  function getFocusable(): HTMLElement[] {
    return Array.from(popover.querySelectorAll<HTMLElement>(focusableSelector));
  }

  function close(): void {
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("mousedown", onOutsideClick, true);
    overlay.remove();
    anchorEl.focus?.();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function onOutsideClick(event: MouseEvent): void {
    if (!popover.contains(event.target as Node)) {
      close();
    }
  }

  closeButton.addEventListener("click", close);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("mousedown", onOutsideClick, true);

  const firstFocusable = getFocusable()[0];
  (firstFocusable ?? popover).focus();

  return { close };
}

function positionPopover(popover: HTMLElement, anchorEl: HTMLElement): void {
  const anchorRect = anchorEl.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const margin = 8;

  let top = anchorRect.bottom + window.scrollY + margin;
  let left = anchorRect.left + window.scrollX;

  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  if (left + popoverRect.width > window.scrollX + viewportWidth) {
    left = window.scrollX + viewportWidth - popoverRect.width - margin;
  }
  if (left < window.scrollX + margin) {
    left = window.scrollX + margin;
  }

  if (anchorRect.bottom + popoverRect.height + margin > viewportHeight) {
    // 下にはみ出す場合は上に表示する
    top = anchorRect.top + window.scrollY - popoverRect.height - margin;
  }
  if (top < window.scrollY + margin) {
    top = window.scrollY + margin;
  }

  popover.style.position = "absolute";
  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}
