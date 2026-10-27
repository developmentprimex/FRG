"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// The horizontal scroll wrapper prevents CSS sticky headers from following the
// page scroll. Mirror only the header in the viewport, using the real cell widths.
export function AdminReportTable({ children, style }) {
  const wrapperRef = useRef(null);
  const floatingRef = useRef(null);
  const headerRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const wrapper = wrapperRef.current;
    const table = wrapper?.querySelector("table");
    if (!table?.tHead) return;
    const floating = floatingRef.current;
    const mirror = headerRef.current;
    const clonedHead = table.tHead.cloneNode(true);
    // The duplicate is purely visual; the original remains the accessible header.
    clonedHead.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
    mirror.replaceChildren(clonedHead);
    let frame = 0;

    function measure() {
      frame = 0;
      const rect = table.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const headHeight = table.tHead.getBoundingClientRect().height;
      const visible = rect.top < 0 && rect.bottom > headHeight && wrapperRect.right > 0 && wrapperRect.left < window.innerWidth;
      floating.style.display = visible ? "block" : "none";
      if (!visible) return;
      const left = Math.max(0, wrapperRect.left + wrapper.clientLeft);
      floating.style.left = `${left}px`;
      floating.style.width = `${Math.max(0, Math.min(wrapperRect.left + wrapper.clientLeft + wrapper.clientWidth, window.innerWidth) - left)}px`;
      mirror.style.width = `${rect.width}px`;
      mirror.style.transform = `translateX(${rect.left - left}px)`;
      mirror.style.fontFamily = getComputedStyle(table).fontFamily;
      Array.from(table.tHead.rows[0].cells).forEach((cell, index) => {
        const clone = clonedHead.rows[0].cells[index];
        const width = `${cell.getBoundingClientRect().width}px`;
        clone.style.width = width;
        clone.style.minWidth = width;
        clone.style.maxWidth = width;
        clone.style.boxSizing = "border-box";
        const cellStyle = getComputedStyle(cell);
        clone.style.background = cellStyle.backgroundColor;
        for (const property of ["color", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform", "textAlign", "padding", "verticalAlign", "borderBottom"]) {
          clone.style[property] = cellStyle[property];
        }
      });
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(wrapper);
    observer.observe(table);
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mounted, children]);

  return <>
    <div ref={wrapperRef} className="admin-reports-table" style={style}>{children}</div>
    {mounted && createPortal(<div ref={floatingRef} aria-hidden="true" style={{ display: "none", position: "fixed", top: 0, zIndex: 25, overflow: "hidden", pointerEvents: "none", background: "var(--app-surface)", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
      <table ref={headerRef} role="presentation" style={{ borderCollapse: "collapse", tableLayout: "fixed" }} />
    </div>, document.body)}
  </>;
}
