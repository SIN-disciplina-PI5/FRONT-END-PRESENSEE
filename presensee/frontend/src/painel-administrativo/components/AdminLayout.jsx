import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import "../styles/admin.css";
import "../styles/AdminMobile.css";

export default function AdminLayout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const toggleRef = useRef(null);
    const closeRef = useRef(null);
    const menuWasOpen = useRef(false);

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!mobileOpen) {
            if (menuWasOpen.current) {
                toggleRef.current?.focus();
            }

            menuWasOpen.current = false;
            return;
        }

        menuWasOpen.current = true;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        closeRef.current?.focus();

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setMobileOpen(false);
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [mobileOpen]);

    return (
        <div className="admin-layout">
            <header className="admin-mobile-appbar">
                <button
                    ref={toggleRef}
                    type="button"
                    className="admin-mobile-menu-trigger"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Abrir menu de navegação"
                    aria-controls="presensee-admin-mobile-drawer"
                    aria-expanded={mobileOpen}
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                    >
                        <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <span className="admin-mobile-brand" translate="no">
                    Presen<span>See</span>
                </span>
            </header>

            {mobileOpen && (
                <button
                    type="button"
                    className="admin-mobile-sidebar-backdrop"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Fechar menu"
                />
            )}

            <div
                id="presensee-admin-mobile-drawer"
                className={`admin-mobile-sidebar-holder${mobileOpen ? " mobile-open" : ""}`}
                onClick={(event) => {
                    if (event.target.closest("a")) {
                        setMobileOpen(false);
                    }
                }}
            >
                <div className="admin-mobile-drawer-top">
                    <strong translate="no">
                        Presen<span>See</span>
                    </strong>

                    <button
                        ref={closeRef}
                        type="button"
                        className="admin-mobile-drawer-close"
                        aria-label="Fechar menu de navegação"
                        onClick={() => setMobileOpen(false)}
                    >
                        ×
                    </button>
                </div>

                <Sidebar tipo="admin" mobileOpen={mobileOpen} />
            </div>

            <main className="admin-main">
                <Outlet />
            </main>
        </div>
    );
}
