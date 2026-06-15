import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSourceColor } from '../../utils/colors';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, p) => sum + p.value, 0);
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] p-3 shadow-[var(--shadow-md)]">
        <p className="font-semibold text-[var(--text-primary)] mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="flex-1 capitalize">{p.name.replace('_', ' ')}</span>
            <span className="font-medium text-[var(--text-primary)]">{p.value}</span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-sm flex justify-between font-semibold text-[var(--text-primary)]">
          <span>Total</span>
          <span>{total}</span>
        </div>
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
          <p className="text-sm text-[var(--text-secondary)]">{totalReviews} total reviews in timeframe</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getSourceColor('app_store') }} />
            <span className="text-[var(--text-secondary)]">App Store</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getSourceColor('play_store') }} />
            <span className="text-[var(--text-secondary)]">Play Store</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative min-h-[200px] md:min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAppStore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={getSourceColor('app_store')} stopOpacity={0.6}/>
                <stop offset="95%" stopColor={getSourceColor('app_store')} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorPlayStore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={getSourceColor('play_store')} stopOpacity={0.6}/>
                <stop offset="95%" stopColor={getSourceColor('play_store')} stopOpacity={0.1}/>
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
              stroke={getSourceColor('play_store')} 
              fill="url(#colorPlayStore)" 
              strokeWidth={2}
              activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--text-primary)' }}
            />
            <Area 
              type="monotone" 
              dataKey="app_store" 
              stackId="1" 
              stroke={getSourceColor('app_store')} 
              fill="url(#colorAppStore)" 
              strokeWidth={2}
              activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--text-primary)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
