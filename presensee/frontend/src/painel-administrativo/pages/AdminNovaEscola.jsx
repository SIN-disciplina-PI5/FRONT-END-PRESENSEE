import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { saveEscola } from "../services/adminDemo"
const initial={nome:"",inep:"",municipio:"",rede:"Estadual",gestor:"",email:"",telefone:"",status:"Pendente"}
export default function AdminNovaEscola(){const [dados,setDados]=useState(initial),navigate=useNavigate();function update(e){setDados(v=>({...v,[e.target.name]:e.target.value}))}function submit(e){e.preventDefault();saveEscola(dados);navigate("/admin/escolas")}
 return <div className="admin-page">
    <div className="admin-heading">
        <div><h1>Cadastrar nova escola</h1>
        <p>Insira os dados institucionais para liberar o acesso ao PresenSee.</p>
        </div></div>
        <form onSubmit={submit} className="admin-panel admin-form">
            <h3>Dados da instituição</h3>
            <div className="admin-form-grid">
                <label>Nome da escola *<input name="nome" value={dados.nome} onChange={update} required/></label>
                <label>Código INEP<input name="inep" value={dados.inep} onChange={update} inputMode="numeric"/></label>
                <label>Município *<input name="municipio" value={dados.municipio} onChange={update} required/></label>
                <label>Rede de ensino<select name="rede" value={dados.rede} onChange={update}>
                    {["Estadual","Municipal","Federal","Privada"].map(x=><option key={x}>{x}</option>)}
                </select></label>
                <label>Gestor responsável *<input name="gestor" value={dados.gestor} onChange={update} required/></label>
                <label>E-mail institucional *<input type="email" name="email" value={dados.email} onChange={update} required/></label>
                <label>Telefone<input name="telefone" value={dados.telefone} onChange={update}/></label>
                <label>Situação inicial<select name="status" value={dados.status} onChange={update}>
                    <option>Pendente</option>
                    <option>Ativa</option>
                </select></label>
            </div>
            <div className="admin-actions">
                <Link className="admin-btn secondary" to="/admin/escolas">Cancelar</Link>
                <button className="admin-btn" type="submit">Salvar escola</button>
            </div>
        </form>
    </div>
}
