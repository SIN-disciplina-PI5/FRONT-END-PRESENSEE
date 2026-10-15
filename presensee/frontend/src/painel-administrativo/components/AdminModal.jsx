import { useEffect } from "react"

export default function AdminModal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(event) { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="admin-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="admin-modal admin-details-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="admin-modal-title">
          <h2>{title}</h2>
          <button type="button" className="admin-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
