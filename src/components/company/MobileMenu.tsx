"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function MobileMenu({ children, english }: { children: ReactNode; english: boolean }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    if (!element) return;
    const previousOverflow = document.documentElement.style.overflow;
    const opener = trigger.current;
    const scroll = { left: window.scrollX, top: window.scrollY };
    document.documentElement.style.overflow = "hidden";
    element.showModal();
    const desktop = window.matchMedia("(min-width: 1280px)");
    const onResize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", onResize);
    return () => {
      desktop.removeEventListener("change", onResize);
      element.close();
      document.documentElement.style.overflow = previousOverflow;
      opener?.focus({ preventScroll: true });
      window.scrollTo({ ...scroll, behavior: "instant" });
    };
  }, [open]);
  return <div className="mobile-menu">
    <button ref={trigger} className="menu-toggle" aria-haspopup="dialog" aria-expanded={open}
      aria-controls="company-menu" onClick={() => setOpen(true)}>
      <span aria-hidden="true">☰</span> {english ? "Menu" : "Меню"}
    </button>
    <dialog ref={dialog} id="company-menu" aria-labelledby="menu-title"
      onClose={() => setOpen(false)} onCancel={() => setOpen(false)}
      onKeyDown={event => {
        if (event.key !== "Tab") return;
        const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')];
        const current = focusable.indexOf(document.activeElement as HTMLElement);
        const next = (current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
        event.preventDefault();
        focusable[next]?.focus();
      }}
      onClick={event => {
        if (event.target !== dialog.current) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setOpen(false);
      }}>
      <div className="drawer-heading"><span id="menu-title">{english ? "Navigation" : "Навигация"}</span>
        <button className="menu-close" onClick={() => setOpen(false)} aria-label={english ? "Close menu" : "Закрыть меню"}>×</button>
      </div>
      <div onClick={event => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>{children}</div>
    </dialog>
  </div>;
}
