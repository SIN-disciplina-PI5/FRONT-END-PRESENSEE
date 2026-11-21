import { Link } from "react-router-dom";
import "../styles/NotFound.css";

export default function NotFound() {
  return (
    <main className="nf-page">
      <div className="nf-card">
        <span className="nf-codigo">404</span>
        <h1>Página não encontrada</h1>
        <p>
          O endereço que você tentou acessar não existe ou foi movido.
        </p>
        <Link to="/" className="nf-botao">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}