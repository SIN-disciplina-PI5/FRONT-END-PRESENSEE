import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/Mobile.css";

function DashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const toggleRef = useRef(null);
  const closeRef = useRef(null);
  const menuWasOpen = useRef(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const calendarDialogRef = useRef(null);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      if (menuWasOpen.current) toggleRef.current?.focus();
      menuWasOpen.current = false;
      return;
    }
    menuWasOpen.current = true;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  
  useEffect(() => {
    if (!location.pathname.toLowerCase().includes("calendario")) return undefined;
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const update = () => {
      const active = mobileQuery.matches && !!document.querySelector(".ce-page .ce-layout .ce-form-panel");
      setCalendarDialogOpen(active);
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    mobileQuery.addEventListener("change", update);
    update();
    return () => {
      observer.disconnect();
      mobileQuery.removeEventListener("change", update);
      setCalendarDialogOpen(false);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!calendarDialogOpen) return undefined;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = document.querySelector(".ce-page .ce-layout .ce-form-panel");
    calendarDialogRef.current = panel;
    const previouslyFocused = document.activeElement;
    if (panel) {
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("tabindex", "-1");
      panel.focus({ preventScroll: true });
    }
    function onEscape(event) {
      if (event.key !== "Escape" || !window.matchMedia("(max-width: 767px)").matches) return;
      event.preventDefault();
      event.stopPropagation();
      panel?.querySelector('.ce-form-heading button[aria-label="Fechar painel"]')?.click();
    }
    document.addEventListener("keydown", onEscape, true);
    return () => {
      document.removeEventListener("keydown", onEscape, true);
      document.body.style.overflow = oldOverflow;
      panel?.removeAttribute("role");
      panel?.removeAttribute("aria-modal");
      panel?.removeAttribute("tabindex");
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [calendarDialogOpen]);

  const closeCalendarDialog = () => {
    document.querySelector('.ce-page .ce-form-panel .ce-form-heading button[aria-label="Fechar painel"]')?.click();
  };

  return (
    <div className="layout">
      <header className="mobile-appbar">
        <button ref={toggleRef} type="button" className="mobile-menu-trigger"
          onClick={() => setMobileOpen(true)} aria-label="Abrir menu de navegação"
          aria-controls="presensee-mobile-drawer" aria-expanded={mobileOpen}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span className="mobile-brand" translate="no">Presen<span>See</span></span>
      </header>
      {mobileOpen && <button className="mobile-sidebar-backdrop" type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />}
      <div id="presensee-mobile-drawer" className={`mobile-sidebar-holder${mobileOpen ? " mobile-open" : ""}`}
        onClick={(event) => { if (event.target.closest("a")) setMobileOpen(false); }}>
        <div className="mobile-drawer-top">
          <strong translate="no">Presen<span>See</span></strong>
          <button ref={closeRef} type="button" className="mobile-drawer-close" aria-label="Fechar menu de navegação" onClick={() => setMobileOpen(false)}>×</button>
        </div>
        <Sidebar mobileOpen={mobileOpen} />
      </div>
      <main className="content">{children}</main>
      {calendarDialogOpen && <button type="button" className="ce-mobile-dialog-backdrop" onClick={closeCalendarDialog} aria-label="Fechar formulário do calendário" />}
    </div>
  );
}
export default DashboardLayout;
