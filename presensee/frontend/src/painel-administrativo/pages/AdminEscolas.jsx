
import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import {
  changeStatus,
  deleteEscola,
  getEscolas
} from "../services/adminDemo"

import EscolaDetalhesModal from "../components/EscolaDetalhesModal"
import "../styles/admin.css"

export default function AdminEscolas() {
  const [escolas, setEscolas] = useState(getEscolas())
  const [busca, setBusca] = useState("")
  const [excluir, setExcluir] = useState(null)
  const [detalhes, setDetalhes] = useState(null)

  // FILTRO RECEBIDO PELA URL

  const [searchParams, setSearchParams] = useSearchParams()

  const filtrosValidos = [
    "Todas",
    "Ativa",
    "Pendente",
    "Bloqueada"
  ]

  const statusUrl = searchParams.get("status")

  const filtro = filtrosValidos.includes(statusUrl)
    ? statusUrl
    : "Todas"

  // ALTERAR FILTRO

  function alterarFiltro(novoFiltro) {
    setSearchParams(
      novoFiltro === "Todas"
        ? {}
        : { status: novoFiltro }
    )
  }

  // ALTERAR STATUS DA ESCOLA

  function status(id, novoStatus) {
    changeStatus(id, novoStatus)
    setEscolas(getEscolas())
  }

  // EXCLUIR ESCOLA

  function confirmarExclusao() {
    if (!excluir) return

    deleteEscola(excluir.id)

    setEscolas(getEscolas())
    setExcluir(null)
    setDetalhes(null)
  }

  // FILTRAR ESCOLAS

  const lista = escolas.filter((escola) => {
    const correspondeStatus =
      filtro === "Todas" || escola.status === filtro

    const correspondeBusca = [
      escola.nome,
      escola.municipio,
      escola.gestor
    ]
      .join(" ")
      .toLowerCase()
      .includes(busca.toLowerCase())

    return correspondeStatus && correspondeBusca
  })

  return (
    <div className="admin-page">

      {/* CABEÇALHO */}

      <div className="admin-heading">
        <div>
          <h1>Escolas</h1>

          <p>
            Cadastre e gerencie instituições vinculadas
            ao projeto.
          </p>
        </div>

        <Link
          className="admin-btn"
          to="/admin/escolas/nova"
        >
          + Nova escola
        </Link>
      </div>

      {/* PAINEL DE ESCOLAS */}

      <section className="admin-panel admin-list-panel">

        {/* FILTROS */}

        <div className="admin-filters">

          <input
            aria-label="Pesquisar escolas"
            placeholder="Buscar escola, município ou gestor..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />

          <select
            aria-label="Filtrar por situação"
            value={filtro}
            onChange={(event) =>
              alterarFiltro(event.target.value)
            }
          >
            {filtrosValidos.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

        </div>

        {/* TABELA DE ESCOLAS */}

        <div className="admin-table-wrap">

          <table className="admin-table">

            <thead>
              <tr>
                <th>Escola</th>
                <th>Município</th>
                <th>Rede</th>
                <th>Gestor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {lista.map((escola) => (
                <tr key={escola.id}>

                  {/* NOME DA ESCOLA */}

                  <td>
                    <button
                      type="button"
                      className="admin-link-button"
                      onClick={() => setDetalhes(escola)}
                    >
                      {escola.nome}
                    </button>

                    {escola.inep && (
                      <small>
                        INEP: {escola.inep}
                      </small>
                    )}
                  </td>

                  {/* MUNICÍPIO */}

                  <td>{escola.municipio}</td>

                  {/* REDE DE ENSINO */}

                  <td>{escola.rede}</td>

                  {/* GESTOR RESPONSÁVEL */}

                  <td>{escola.gestor}</td>

                  {/* STATUS */}

                  <td>
                    <span
                      className={`admin-badge ${escola.status.toLowerCase()}`}
                    >
                      {escola.status}
                    </span>
                  </td>

                  {/* AÇÕES */}

                  <td>
                    <div className="admin-row-actions">

                      {/* DETALHES DA ESCOLA */}

                      <button
                        type="button"
                        className="admin-outline-btn"
                        onClick={() => setDetalhes(escola)}
                      >
                        Detalhes
                      </button>

                      {/* ALTERAR STATUS */}

                      <select
                        aria-label={`Alterar situação de ${escola.nome}`}
                        value={escola.status}
                        onChange={(event) =>
                          status(
                            escola.id,
                            event.target.value
                          )
                        }
                      >
                        <option value="Ativa">
                          Ativa
                        </option>

                        <option value="Pendente">
                          Pendente
                        </option>

                        <option value="Bloqueada">
                          Bloqueada
                        </option>
                      </select>

                      {/* EXCLUIR ESCOLA */}

                      <button
                        type="button"
                        className="admin-delete-button"
                        onClick={() => setExcluir(escola)}
                        aria-label={`Excluir ${escola.nome}`}
                        title="Excluir escola"
                      >
                        Excluir
                      </button>

                    </div>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>

          {/* NENHUMA ESCOLA ENCONTRADA */}

          {!lista.length && (
            <p className="admin-empty">
              Nenhuma escola encontrada.
            </p>
          )}

        </div>
      </section>

      {/* POPUP DE DETALHES DA ESCOLA */}

      <EscolaDetalhesModal
        escola={detalhes}
        onClose={() => setDetalhes(null)}
      />

      {/* POPUP DE CONFIRMAÇÃO DE EXCLUSÃO */}

      {excluir && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setExcluir(null)
            }
          }}
        >
          <div
            className="admin-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="admin-delete-title"
            aria-describedby="admin-delete-description"
          >

            <h2 id="admin-delete-title">
              Excluir escola?
            </h2>

            <p id="admin-delete-description">
              Deseja excluir{" "}
              <strong>{excluir.nome}</strong>?

              Esta ação remove a instituição dos dados
              demonstrativos deste navegador e será
              registrada na auditoria.
            </p>

            <div className="admin-actions">

              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setExcluir(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={confirmarExclusao}
              >
                Sim, excluir escola
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}
