import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { pageDimensions } from "./paginateResume";

// html2canvas does not understand modern CSS color() / color-mix() values.
// Ask the browser to convert them to sRGB, only in the export copy.
function canvasColors(document: Document, root: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  const colors = new Map<string, string>();
  for (const element of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
    const computed = document.defaultView!.getComputedStyle(element);
    for (const property of ["color", "background-color", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "outline-color", "text-decoration-color", "fill", "stroke"]) {
      const color = computed.getPropertyValue(property);
      if (!/(?:color|color-mix|oklab|oklch|lab|lch)\(/.test(color)) continue;
      let rgb = colors.get(color);
      if (!rgb) {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
        rgb = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        colors.set(color, rgb);
      }
      element.style.setProperty(property, rgb, "important");
    }
  }
}

export async function exportResume(node: HTMLElement, size: "a4" | "letter", filename: string) {
  await document.fonts.ready;
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  // A stable snapshot lets the user keep editing and zooming during export.
  const snapshot = node.cloneNode(true) as HTMLElement;
  snapshot.querySelector(".resume-measure")?.remove();
  snapshot.style.cssText += ";position:absolute;left:-10000px;top:0;width:620px;zoom:1;pointer-events:none;";
  snapshot.setAttribute("aria-hidden", "true");
  document.body.append(snapshot);
  try {
    const pages = Array.from(snapshot.querySelectorAll<HTMLElement>(".resume-page"));
    if (!pages.length) throw new Error("Pages are still being prepared. Please try again.");
    const pdf = new jsPDF("p", "mm", size);
    const { widthMM, heightMM } = pageDimensions(size);
    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, { scale: 2, backgroundColor: "#ffffff", onclone: canvasColors });
      if (index) pdf.addPage(size, "p");
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, widthMM, heightMM);
      canvas.width = canvas.height = 0;
    }
    pdf.save(filename);
  } finally { snapshot.remove(); }
}
