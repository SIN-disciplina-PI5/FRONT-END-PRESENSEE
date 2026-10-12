
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

function GaugeChart({ value = 0, color, label }) {
  const percentual = Math.min(100, Math.max(0, Number(value) || 0));

  const cor =
    color ||
    (percentual < 75
      ? "#ef4444"
      : percentual < 90
        ? "#eab308"
        : "#22c55e");

  return (
    <div className="gauge-chart perfil-gauge-chart">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[{ value: percentual, fill: cor }]}
          cx="50%"
          cy="50%"
          innerRadius="72%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
          barSize={10}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />

          <RadialBar
            dataKey="value"
            fill={cor}
            background={{ fill: "#ececf5" }}
            cornerRadius={20}
            isAnimationActive={true}
            animationDuration={700}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      <span className="gauge-chart-label perfil-gauge-valor">
        {label ?? `${Math.round(percentual)}%`}
      </span>
    </div>
  );
}

export default GaugeChart;
