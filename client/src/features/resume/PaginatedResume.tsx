import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { DesignSettings } from "../../types/resume";
import { pageDimensions, paginateResume } from "./paginateResume";

export default function PaginatedResume({ children, design, size = "a4", onPageCount }: {
  children: ReactNode; design: DesignSettings; size?: "a4" | "letter"; onPageCount: (count: number) => void;
}) {
  const source = useRef<HTMLDivElement>(null);
  const measurement = useRef<HTMLDivElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const { height, widthMM, heightMM } = pageDimensions(size);
  useLayoutEffect(() => {
    let active = true;
    let frame = 0;
    const render = () => {
      if (!active || !source.current?.firstElementChild || !pages.current || !measurement.current) return;
      try {
        const count = paginateResume(source.current.firstElementChild as HTMLElement, measurement.current, height);
        pages.current.replaceChildren(...measurement.current.childNodes);
        onPageCount(count);
        setError("");
      } catch (reason) {
        pages.current.replaceChildren();
        measurement.current.replaceChildren();
        onPageCount(0);
        setError(reason instanceof Error ? reason.message : "Could not lay out resume pages.");
      }
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(render); };
    render();
    void document.fonts.ready.then(schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    source.current?.addEventListener("load", schedule, true);
    const element = source.current;
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      document.fonts.removeEventListener("loadingdone", schedule);
      element?.removeEventListener("load", schedule, true);
    };
  }, [children, design, height, onPageCount]);
  return <>
    <style>{`@page { size: ${widthMM}mm ${heightMM}mm; margin: 0; }`}</style>
    {createPortal(<div className="resume-measure" aria-hidden="true" style={{
      "--accent": design.accent, "--cv-font": design.font, "--space": design.spacing,
      "--body-font-size": `${design.bodyFontSize}px`, "--name-font-size": `${design.nameFontSize}px`,
    } as CSSProperties}>
      <div ref={source}>{children}</div>
      <div ref={measurement} />
    </div>, document.body)}
    {error && <p className="pagination-error" role="alert">{error}</p>}
    <div className="resume-pages" ref={pages} style={{ "--resume-print-scale": widthMM * 96 / 25.4 / 620 } as CSSProperties} />
  </>;
}
