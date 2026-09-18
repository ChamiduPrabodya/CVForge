export const PAGE_WIDTH = 620;
export const pageDimensions = (size: "a4" | "letter" = "a4") => ({
  width: PAGE_WIDTH,
  height: PAGE_WIDTH * (size === "letter" ? 11 / 8.5 : 297 / 210),
  widthMM: size === "letter" ? 215.9 : 210,
  heightMM: size === "letter" ? 279.4 : 297,
});

// Work only on detached copies of the preview. The editable CV and React's DOM
// are never changed. Each column flows independently, using the actual fonts.
export function paginateResume(source: HTMLElement, host: HTMLElement, height: number) {
  const skeleton = source.cloneNode(true) as HTMLElement;
  const sections = Array.from(skeleton.querySelectorAll<HTMLElement>(".cv-section"));
  const originals = sections.map(section => section.cloneNode(true) as HTMLElement);
  const groups = new Map<Element, number[]>();
  sections.forEach((section, index) => {
    // Kumari's paired rows belong to one vertical flow, unlike sidebar columns.
    const parent = section.closest(".kumari-body") ?? section.parentElement!;
    const group = groups.get(parent) ?? [];
    group.push(index);
    groups.set(parent, group);
    const slot = document.createElement("div");
    slot.dataset.pageSlot = String(index);
    slot.hidden = true;
    section.replaceWith(slot);
  });
  skeleton.style.minHeight = `${height}px`;
  skeleton.style.width = `${PAGE_WIDTH}px`;
  const pages: HTMLElement[] = [];
  host.replaceChildren();
  const pageAt = (index: number) => {
    while (pages.length <= index) {
      const page = skeleton.cloneNode(true) as HTMLElement;
      const frame = document.createElement("div");
      frame.className = "resume-page";
      frame.style.height = `${height}px`;
      frame.setAttribute("aria-label", `Resume page ${pages.length + 1}`);
      frame.append(page);
      host.append(frame);
      pages.push(page);
    }
    return pages[index];
  };
  // Integer scrollHeight can round down, so also measure the actual layout.
  const fits = (page: HTMLElement) => {
    const rect = page.getBoundingClientRect();
    return page.scrollHeight <= height + 0.5 && rect.height * PAGE_WIDTH / rect.width <= height + 0.5;
  };
  const fragmentAt = (page: HTMLElement, index: number) => {
    const slot = page.querySelector<HTMLElement>(`[data-page-slot="${index}"]`)!;
    if (slot.classList.contains("resume-section-fragment")) return slot;
    const fragment = originals[index].cloneNode(false) as HTMLElement;
    fragment.dataset.pageSlot = String(index);
    fragment.classList.add("resume-section-fragment");
    const heading = originals[index].querySelector(":scope > h3");
    if (heading) fragment.append(heading.cloneNode(true));
    slot.replaceWith(fragment);
    return fragment;
  };
  const clearEmpty = (fragment: HTMLElement) => {
    if (Array.from(fragment.childNodes).every(child => child instanceof HTMLElement && child.tagName === "H3")) {
      const slot = document.createElement("div");
      slot.dataset.pageSlot = fragment.dataset.pageSlot;
      slot.hidden = true;
      fragment.replaceWith(slot);
    }
  };

  for (const indices of groups.values()) {
    let pageIndex = 0;
    for (const index of indices) {
      const children = Array.from(originals[index].childNodes)
        .filter(child => !(child instanceof HTMLElement && child.tagName === "H3"));
      for (const child of children) {
        let remaining: Node | null = child.cloneNode(true);
        let fresh = false;
        while (remaining) {
          const page = pageAt(pageIndex);
          const fragment = fragmentAt(page, index);
          fragment.append(remaining);
          if (fits(page)) break;
          fragment.removeChild(remaining);
          // Keep normal entries together. Lists and long paragraphs can use
          // the remaining space; oversized entries split on the next page.
          const canSplit = remaining instanceof HTMLElement && remaining.matches("p, ul, ol, dl, .cv-skills, .cv-list");
          if (!fresh && !canSplit && (page.querySelectorAll(".resume-section-fragment").length > 1 || fragment.children.length > 1)) {
            clearEmpty(fragment);
            pageIndex++;
            fresh = true;
            continue;
          }
          const split = splitToFit(remaining, fragment, () => fits(page));
          if (split.head) {
            remaining = split.tail;
          } else {
            clearEmpty(fragment);
            if (fresh) throw new Error("A resume element cannot fit on a page. Reduce the font size or shorten the heading.");
          }
          pageIndex++;
          fresh = true;
        }
      }
    }
  }
  pageAt(0);
  if (pages.some(page => !fits(page))) throw new Error("The resume heading cannot fit on a page. Reduce the font size or shorten the heading.");
  return pages.length;
}

// Append the largest fitting prefix, preserving nested markup. Words, list
// items, and entries are kept intact where possible; very long tokens still
// make progress. Text is never discarded or rewritten.
function splitToFit(node: Node, parent: Node, fits: () => boolean): { head: Node | null; tail: Node | null } {
  const whole = node.cloneNode(true);
  parent.appendChild(whole);
  if (fits()) return { head: whole, tail: null };
  const gridColumns = whole instanceof HTMLElement && getComputedStyle(whole).display === "grid"
    ? getComputedStyle(whole).gridTemplateColumns : null;
  parent.removeChild(whole);
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent ?? "";
    const text = document.createTextNode("");
    parent.appendChild(text);
    let low = 0, high = value.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      text.data = value.slice(0, mid);
      if (fits()) low = mid; else high = mid - 1;
    }
    if (!low) { text.remove(); return { head: null, tail: node }; }
    const wordEnd = value.slice(0, low).search(/\s+\S*$/);
    if (wordEnd > 0 && low < value.length) low = wordEnd + 1;
    // Avoid splitting a UTF-16 surrogate pair.
    if (low > 0 && /[\uD800-\uDBFF]/.test(value[low - 1])) low--;
    if (!low) { text.remove(); return { head: null, tail: node }; }
    text.data = value.slice(0, low);
    return { head: text, tail: low < value.length ? document.createTextNode(value.slice(low)) : null };
  }
  if (!node.hasChildNodes()) return { head: null, tail: node };
  const head = node.cloneNode(false);
  const tail = node.cloneNode(false);
  if (gridColumns && head instanceof HTMLElement && tail instanceof HTMLElement) {
    head.style.gridTemplateColumns = gridColumns;
    tail.style.gridTemplateColumns = gridColumns;
  }
  parent.appendChild(head);
  const children = Array.from(node.childNodes);
  for (let index = 0; index < children.length; index++) {
    const split = splitToFit(children[index], head, fits);
    if (split.tail) {
      // A split dated entry must retain its column positions on continuation
      // pages. Empty cells carry layout only, never duplicate completed text.
      if (head instanceof HTMLElement) {
        const style = getComputedStyle(head);
        const columns = style.gridTemplateColumns.match(/[\d.]+px/g)?.length ?? 0;
        const elements = children.filter(child => child instanceof HTMLElement);
        if (style.display === "grid" && columns > 1 && elements.length <= columns) {
          children.slice(0, index).forEach(child => {
            if (!(child instanceof HTMLElement)) return;
            const spacer = child.cloneNode(false) as HTMLElement;
            spacer.setAttribute("aria-hidden", "true");
            spacer.dataset.paginationSpacer = "true";
            spacer.style.cssText += ";display:block!important;visibility:hidden;height:0;min-height:0;margin:0;padding:0;border:0;";
            // Template :empty rules collapse missing date columns. Keep this
            // structural cell nonempty without adding any visible text.
            spacer.appendChild(document.createElement("span"));
            tail.appendChild(spacer);
          });
        }
      }
      tail.appendChild(split.tail.cloneNode(true));
      children.slice(index + 1).forEach(child => tail.appendChild(child.cloneNode(true)));
      if (!head.hasChildNodes()) { parent.removeChild(head); return { head: null, tail: node }; }
      return { head, tail };
    }
  }
  return { head, tail: null };
}
