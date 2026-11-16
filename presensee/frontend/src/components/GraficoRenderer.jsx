import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip,
  XAxis, YAxis,
} from "recharts";

const CORES = ["#633df2", "#8b6cf6", "#b39dfa", "#00b894", "#fdcb6e", "#ff7675"];
const PRIMARIA = "#633df2";
const eixo = { fill: "var(--color-text-muted)", fontSize: 12 };
const grade = "var(--color-border)";

export const TIPOS_GRAFICO = ["linha", "barras", "area", "dispersao", "pizza", "colunas"];

function Vazio() {
  return <div className="grafico-vazio">Sem dados para exibir.</div>;
}

export default function GraficoRenderer({ grafico, altura = 220 }) {
  const dados = Array.isArray(grafico?.dados) ? grafico.dados : [];
  if (dados.length === 0) return <Vazio />;

  const margem = { top: 10, right: 12, bottom: 0, left: -12 };
  let chart;

  switch (grafico.tipo) {
    case "linha":
      chart = (
        <LineChart data={dados} margin={margem}>
          <CartesianGrid stroke={grade} vertical={false} />
          <XAxis dataKey="nome" tick={eixo} axisLine={false} tickLine={false} />
          <YAxis tick={eixo} axisLine={false} tickLine={false} />
          <Tooltip />
          <Line type="monotone" dataKey="valor" stroke={PRIMARIA} strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      );
      break;

    case "area":
      chart = (
        <AreaChart data={dados} margin={margem}>
          <defs>
            <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARIA} stopOpacity={0.35} />
              <stop offset="100%" stopColor={PRIMARIA} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={grade} vertical={false} />
          <XAxis dataKey="nome" tick={eixo} axisLine={false} tickLine={false} />
          <YAxis tick={eixo} axisLine={false} tickLine={false} />
          <Tooltip />
          <Area type="monotone" dataKey="valor" stroke={PRIMARIA} strokeWidth={2.5} fill="url(#gradArea)" />
        </AreaChart>
      );
      break;

    case "colunas": // barras na vertical
      chart = (
        <BarChart data={dados} margin={margem}>
          <CartesianGrid stroke={grade} vertical={false} />
          <XAxis dataKey="nome" tick={eixo} axisLine={false} tickLine={false} />
          <YAxis tick={eixo} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(99,61,242,.08)" }} />
          <Bar dataKey="valor" fill={PRIMARIA} radius={[6, 6, 0, 0]} />
        </BarChart>
      );
      break;

    case "barras": // barras na horizontal
      chart = (
        <BarChart data={dados} layout="vertical" margin={{ ...margem, left: 8 }}>
          <CartesianGrid stroke={grade} horizontal={false} />
          <XAxis type="number" tick={eixo} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="nome" tick={eixo} axisLine={false} tickLine={false} width={80} />
          <Tooltip cursor={{ fill: "rgba(99,61,242,.08)" }} />
          <Bar dataKey="valor" fill={PRIMARIA} radius={[0, 6, 6, 0]} />
        </BarChart>
      );
      break;

    case "dispersao": // dados no formato { x, y }
      chart = (
        <ScatterChart margin={margem}>
          <CartesianGrid stroke={grade} />
          <XAxis type="number" dataKey="x" name={grafico.eixoX || "x"} tick={eixo} axisLine={false} tickLine={false} />
          <YAxis type="number" dataKey="y" name={grafico.eixoY || "y"} tick={eixo} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={dados} fill="#8b6cf6" />
        </ScatterChart>
      );
      break;

    case "pizza":
      chart = (
        <PieChart>
          <Tooltip />
          <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
            {dados.map((_, i) => (
              <Cell key={i} fill={CORES[i % CORES.length]} />
            ))}
          </Pie>
        </PieChart>
      );
      break;

    default:
      return <Vazio />;
  }

  return (
    <div style={{ width: "100%", height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        {chart}
      </ResponsiveContainer>
    </div>
  );
}