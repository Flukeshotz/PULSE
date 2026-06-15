import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Star, Filter } from 'lucide-react';
import { getRatingColor } from '../../utils/colors';

export function RatingBars({ report }) {
  // Filtered Sentiment Data
  const c = report?.counts || {};
  const pos = c.filtered_short_positive ?? 0;
  const neg = c.filtered_short_negative ?? 0;
  const neu = c.filtered_short_neutral ?? 0;
  const totalFiltered = c.filtered_short ?? (pos + neg + neu);

  const filteredData = [
    { name: 'Positive', count: pos, fill: 'var(--positive)' },
    { name: 'Neutral', count: neu, fill: 'var(--neutral-sentiment)' },
    { name: 'Negative', count: neg, fill: 'var(--negative)' }
  ].filter(d => d.count > 0);

  // Rating Distribution Data
  const ratingDist = report?.rating_distribution || {};
  const avgRating = report?.average_rating || 0;
  
  const ratingData = [
    { name: '5★', count: ratingDist['5'] || 0, fill: getRatingColor(5) },
    { name: '4★', count: ratingDist['4'] || 0, fill: getRatingColor(4) },
    { name: '3★', count: ratingDist['3'] || 0, fill: getRatingColor(3) },
    { name: '2★', count: ratingDist['2'] || 0, fill: getRatingColor(2) },
    { name: '1★', count: ratingDist['1'] || 0, fill: getRatingColor(1) }
  ];

  return (
    <div className="bg-[var(--bg-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] h-full flex flex-col md:flex-row overflow-hidden">
      
      {/* Rating Distribution Side */}
      <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-[var(--border-subtle)]">
        <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Rating Distribution</h3>
        
        <div className="flex items-center mb-6 gap-3">
          <div className="flex items-center justify-center bg-[var(--bg-elevated)] rounded-xl px-4 py-2 gap-2">
            <span className="text-3xl font-bold text-[var(--text-primary)]">{avgRating.toFixed(2)}</span>
            <Star className="w-6 h-6 text-[var(--star-5)]" fill="var(--star-5)" />
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Average Rating</div>
        </div>

        <div className="relative min-h-[150px]">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={ratingData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 14, fontWeight: 500}} width={45} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                {ratingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList dataKey="count" position="right" fill="var(--text-secondary)" fontSize={12} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filtered Sentiment Side */}
      <div className="flex-1 p-6">
        <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Filtered Sentiment</h3>
        
        <div className="flex items-end mb-6 gap-2">
          <div className="text-3xl font-bold text-[var(--text-primary)]">{totalFiltered}</div>
          <div className="text-sm text-[var(--text-secondary)] mb-1">short reviews filtered</div>
        </div>

        <div className="relative min-h-[120px]">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={filteredData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 500}} width={70} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList dataKey="count" position="right" fill="var(--text-secondary)" fontSize={12} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
