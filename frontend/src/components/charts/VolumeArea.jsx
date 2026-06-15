import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSourceColor } from '../../utils/colors';
import { formatSourceName } from '../../utils/format';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, p) => sum + p.value, 0);
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] p-3 shadow-[var(--shadow-md)]">
        <p className="font-semibold text-[var(--text-primary)] mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="flex-1 capitalize">{formatSourceName(p.name)}</span>
            <span className="font-medium text-[var(--text-primary)]">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function VolumeArea({ data }) {
  if (!data || data.length === 0) return null;

  // Process data for the chart
  const chartData = data.map(report => {
    const week = report.iso_week.split('-')[1]; // 'W24'
    const counts = report.counts || {};
    const sourceCounts = report.source_counts || {};
    
    return {
      week,
      app_store: sourceCounts.app_store || 0,
      play_store: sourceCounts.play_store || 0,
      total: counts.reviews || 0
    };
  });

  const totalReviews = chartData.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="bg-[var(--bg-card)] rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-sm)]">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Review Volume</h3>
          <p className="text-sm text-[var(--text-secondary)]">{totalReviews} clean reviews analyzed in timeframe</p>
        </div>
      </div>

      <div className="flex-1 relative h-[200px] md:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--text-primary)" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="var(--text-primary)" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="play_store" 
              stackId="1"
              stroke="var(--source-playstore)" 
              fill="var(--source-playstore)" 
              strokeWidth={2}
              activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--source-playstore)' }}
            />
            <Area 
              type="monotone" 
              dataKey="app_store" 
              stackId="1"
              stroke="var(--source-appstore)" 
              fill="var(--source-appstore)" 
              strokeWidth={2}
              activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--source-appstore)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
