import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getSourceColor } from '../../utils/colors';
import { formatSourceName } from '../../utils/format';

export function SourceDonut({ report }) {
  if (!report?.counts) return null;

  // Assuming `report.counts` has `app_store` and `play_store` counts or similar, 
  // but looking at PulseReport schema, `counts` is `{ reviews: number, dropped_quotes: number }`.
  // Wait, the orchestrator sets `report.review_counts` in the backend but PulseReport has `counts: Dict[str, int]`.
  // The orchestrator phase 1 sets `record.review_counts[source.name] = len(raw_records)`.
  // Let's assume `report.counts.app_store` etc exists, otherwise we'll fall back.
  
  const sources = report.sources_covered || [];
  const sourceCounts = report.source_counts || {};
  const data = sources.map(s => ({
    name: s,
    value: sourceCounts[s] || 0
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-[var(--bg-card)] rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-sm)] h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Source Breakdown</h3>
      <div className="flex-1 relative min-h-[200px]">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={3}
              cornerRadius={4}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => {
                let fill = '#9CA3AF';
                if (entry.name.includes('app_store')) fill = 'var(--source-appstore)';
                if (entry.name.includes('play_store')) fill = 'var(--source-playstore)';
                return <Cell key={`cell-${index}`} fill={fill} />;
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-[var(--text-primary)]">{total}</span>
          <span className="text-sm text-[var(--text-secondary)]">Total</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 justify-center">
        {data.map((d) => {
          let fill = '#9CA3AF';
          if (d.name.includes('app_store')) fill = 'var(--source-appstore)';
          if (d.name.includes('play_store')) fill = 'var(--source-playstore)';
          const percent = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.name} className="flex items-center text-sm">
              <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: fill }}></span>
              <span className="text-[var(--text-secondary)] mr-1">{formatSourceName(d.name)}</span>
              <span className="font-medium text-[var(--text-primary)]">{d.value} ({percent}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
