import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Star, MessageSquareWarning, Calendar } from 'lucide-react';
import { useCompareData } from '../../hooks/useCompareData';
import { parseThemeName } from '../../utils/format';
import { getRatingColor } from '../../utils/colors';

// Fixed per-product identity colors (distinct from rating/sentiment colors,
// which mean something else in this dashboard).
const PRODUCT_COLORS = ['#6366F1', '#EC4899', '#0EA5E9', '#F59E0B', '#10B981', '#F97316'];

function topComplaint(report) {
  if (!report?.themes?.length) return null;
  const negative = report.themes.find(t => parseThemeName(t.name).sentiment === 'negative');
  const theme = negative || report.themes[0];
  const { name } = parseThemeName(theme.name);
  return { name, mentions: theme.quotes?.length || 0 };
}

export function Compare({ manifest }) {
  const { data, products, commonWeeks, loading, error } = useCompareData(manifest);
  const [week, setWeek] = useState(null);

  const activeWeek = week || commonWeeks[commonWeeks.length - 1];

  const cards = useMemo(() => {
    if (!data || !activeWeek) return [];
    return products
      .map((product, i) => {
        const report = data[product]?.[activeWeek];
        if (!report) return null;
        return {
          product,
          displayName: manifest.products[product]?.display_name || product,
          color: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
          rating: report.average_rating || 0,
          reviews: report.counts?.reviews || 0,
          sources: report.sources_covered || [],
          complaint: topComplaint(report),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.rating - a.rating);
  }, [data, products, activeWeek, manifest]);

  const trendData = useMemo(() => {
    if (!data || commonWeeks.length === 0) return [];
    return commonWeeks.map(w => {
      const point = { week: w.split('-')[1] };
      products.forEach(product => {
        const r = data[product]?.[w];
        if (r?.average_rating != null) point[product] = parseFloat(r.average_rating.toFixed(2));
      });
      return point;
    });
  }, [data, products, commonWeeks]);

  if (loading) {
    return <div className="py-20 text-center text-[var(--text-secondary)]">Loading comparison…</div>;
  }
  if (error) {
    return <div className="py-20 text-center text-[var(--negative)]">{error}</div>;
  }
  if (commonWeeks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Calendar className="w-16 h-16 text-[var(--text-tertiary)] mb-4 opacity-50" />
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No overlapping weeks yet</h3>
        <p className="text-[var(--text-secondary)] text-center max-w-md">
          Comparison needs at least one week where every tracked product has data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Week selector — shared across every comparison on this page */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">How they stack up</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Ranked by average rating · same week, same methodology, across every tracked app.
          </p>
        </div>
        <select
          value={activeWeek}
          onChange={e => setWeek(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
        >
          {commonWeeks.map(w => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      {/* Ranked cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div
            key={c.product}
            className="bg-[var(--bg-card)] rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: c.color }} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                #{i + 1}
              </span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {c.reviews.toLocaleString()} reviews
              </span>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{c.displayName}</h3>
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-3xl font-bold" style={{ color: getRatingColor(c.rating) }}>
                {c.rating.toFixed(2)}
              </span>
              <Star className="w-5 h-5 mt-1" fill={getRatingColor(c.rating)} stroke={getRatingColor(c.rating)} />
            </div>
            {c.complaint && (
              <div className="flex items-start gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <MessageSquareWarning className="w-4 h-4 text-[var(--negative)] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-0.5">Top complaint</div>
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{c.complaint.name}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{c.complaint.mentions} mentions</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Multi-line rating trend across every product */}
      <div className="bg-[var(--bg-card)] rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-sm)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Rating trend</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6">Average rating across the weeks all four apps share.</p>
        <div className="h-[280px] md:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
              <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickFormatter={v => v.toFixed(1)} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}
                formatter={(value, name) => [value?.toFixed(2), manifest.products[name]?.display_name || name]}
              />
              <Legend
                formatter={name => manifest.products[name]?.display_name || name}
                wrapperStyle={{ fontSize: 13 }}
              />
              {products.map((product, i) => (
                <Line
                  key={product}
                  type="monotone"
                  dataKey={product}
                  stroke={PRODUCT_COLORS[i % PRODUCT_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 2, fill: 'var(--bg-card)' }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
