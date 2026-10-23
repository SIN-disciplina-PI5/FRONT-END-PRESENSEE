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
    </div>
  );
}
export default DashboardLayout;
