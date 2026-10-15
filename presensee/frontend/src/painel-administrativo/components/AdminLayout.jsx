import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { logoutAdminDemo } from "../services/adminDemo"
import "../styles/admin.css"
const menu = [["/admin/dashboard","⌂","Dashboard"],["/admin/escolas","▤","Escolas"],["/admin/gestores","♙","Gestores"],["/admin/auditoria","▦","Auditoria"]]
export default function AdminLayout(){
 const navigate = useNavigate()
 const [collapsed,setCollapsed]=useState(false)
 const [tema,setTema]=useState(localStorage.getItem("tema")||"light")
 useEffect(()=>{document.documentElement.setAttribute("data-theme",tema);localStorage.setItem("tema",tema)},[tema])
 return <div className="admin-layout">
   <aside className={`admin-sidebar ${collapsed?"compact":""}`}>
     <div className="admin-brand"><h2 className="brand-font">Presen<span>See</span></h2><button onClick={()=>setCollapsed(!collapsed)} aria-label="Recolher menu">‹</button></div>
     <nav>{menu.map(([url,icon,label])=><NavLink to={url} key={url} title={label} className={({isActive})=>isActive?"active":""}><b>{icon}</b>{!collapsed&&<span>{label}</span>}</NavLink>)}</nav>
     <button className="admin-bottom" onClick={()=>setTema(tema==="light"?"dark":"light")}>☾ {!collapsed&&"Modo escuro / claro"}</button>
     <div className="admin-user">◉ {!collapsed&&<span>Superadministrador<small>Demonstração local</small></span>}</div>
     <button className="admin-bottom" onClick={()=>{logoutAdminDemo();localStorage.removeItem("token");localStorage.removeItem("usuario");navigate("/login",{replace:true})}}>⇥ {!collapsed&&"Encerrar sessão"}</button>
   </aside><main className="admin-main"><Outlet/></main>
 </div>
}
