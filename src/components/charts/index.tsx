import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

export function ScoreRadar({ data }: { data: { budget_efficiency: number; comfort: number; exploration: number; value_for_money: number } }) {
  const points = [
    { axis: "Budget", value: data.budget_efficiency },
    { axis: "Comfort", value: data.comfort },
    { axis: "Exploration", value: data.exploration },
    { axis: "Value", value: data.value_for_money },
  ];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={points} outerRadius={85}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
        <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10 }} angle={90} />
        <Radar dataKey="value" stroke="hsl(var(--brand))" fill="hsl(var(--brand))" fillOpacity={0.35} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function CostBars({ data }: { data: { flights_inr: number; hotels_inr: number; activities_inr: number; food_inr: number; transport_inr: number } }) {
  const points = [
    { name: "Flights", inr: data.flights_inr },
    { name: "Hotels", inr: data.hotels_inr },
    { name: "Activities", inr: data.activities_inr },
    { name: "Food", inr: data.food_inr },
    { name: "Transport", inr: data.transport_inr },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={points}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />
        <Bar dataKey="inr" fill="hsl(var(--brand))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];
export function CostPie({ data }: { data: { flights_inr: number; hotels_inr: number; activities_inr: number; food_inr: number; transport_inr: number } }) {
  const points = [
    { name: "Flights", value: data.flights_inr },
    { name: "Hotels", value: data.hotels_inr },
    { name: "Activities", value: data.activities_inr },
    { name: "Food", value: data.food_inr },
    { name: "Transport", value: data.transport_inr },
  ].filter((p) => p.value > 0);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={points} dataKey="value" nameKey="name" outerRadius={85} label={(e: any) => `${e.name}`}>
          {points.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function FlexPriceLine({ data }: { data: { date: string; cheapest_inr: number | null }[] }) {
  const points = data.map((d) => ({ date: d.date.slice(5), inr: d.cheapest_inr ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={points}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />
        <Line type="monotone" dataKey="inr" stroke="hsl(var(--brand))" strokeWidth={2.5} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
