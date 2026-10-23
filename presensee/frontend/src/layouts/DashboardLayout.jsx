import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/Mobile.css";

function DashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (event) => { if (event.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  return (
    <div className="layout">
      <header className="mobile-appbar">
        <button type="button" className="mobile-menu-trigger" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" aria-expanded={mobileOpen}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span className="mobile-brand" translate="no">Presen<span>See</span></span>
      </header>
      {mobileOpen && <button className="mobile-sidebar-backdrop" type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />}
      <div className={`mobile-sidebar-holder${mobileOpen ? " mobile-open" : ""}`} onClick={(event) => { if (event.target.closest("a")) setMobileOpen(false); }}>
        <Sidebar mobileOpen={mobileOpen} />
      </div>
      <main className="content">{children}</main>
    </div>
  );
}
export default DashboardLayout;
