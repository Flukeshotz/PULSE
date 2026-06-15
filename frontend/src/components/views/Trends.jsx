import { VolumeArea } from '../charts/VolumeArea';
import { RatingTrend } from '../charts/RatingTrend';
import { ThemeHeatmap } from '../charts/ThemeHeatmap';
import { Calendar } from 'lucide-react';
import { useTrendData } from '../../hooks/useTrendData';

export function Trends({ manifest, selectedProduct }) {
  const { data, themeMap, loading, error } = useTrendData(manifest, selectedProduct);

  if (loading) {
    return <div className="py-20 text-center text-[var(--text-secondary)]">Loading trend data...</div>;
  }

  if (error) {
    return <div className="py-20 text-center text-[var(--negative)]">{error}</div>;
  }

  if (!data || data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Calendar className="w-16 h-16 text-[var(--text-tertiary)] mb-4 opacity-50" />
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Not Enough Data</h3>
        <p className="text-[var(--text-secondary)] text-center max-w-md">
          Trends appear after the second weekly run. Run a backfill to see historical data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VolumeArea data={data} />
        <RatingTrend data={data} />
      </div>
      
      <ThemeHeatmap data={data} themeMapData={themeMap} />
      
      {/* Average filtered context could go here, omitting for brevity */}
    </div>
  );
}
