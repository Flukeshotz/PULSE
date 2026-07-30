import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Star, MessageSquareWarning, Calendar, TrendingUp, TrendingDown, Sparkles, Users2 } from 'lucide-react';
import { useCompareData } from '../../hooks/useCompareData';
import { parseThemeName } from '../../utils/format';
import { getRatingColor } from '../../utils/colors';
import { categorizeTheme, CATEGORY_ORDER } from '../../utils/themeCategory';

const PRODUCT_COLORS = ['#6366F1', '#EC4899', '#0EA5E9', '#F59E0B', '#10B981', '#F97316'];

function topComplaintTheme(report) {
  if (!report?.themes?.length) return null;
  return report.themes.find(t => parseThemeName(t.name).sentiment === 'negative') || report.themes[0];
}

function onestarPct(report) {
  const dist = report?.rating_distribution;
  if (!dist) return null;
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (!total) return null;
  return ((dist['1'] || 0) / total) * 100;
}

function sourceSplit(report) {
  const sc = report?.source_counts || {};
  const total = Object.values(sc).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.entries(sc)
    .map(([source, count]) => ({ source, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);
}

function TrendBadge({ trend }) {
  if (!trend) return null;
  if (trend.status === 'new' || trend.age_weeks === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
        <Sparkles className="w-3 h-3" /> New this week
      </span>
    );
  }
  const pct = trend.mentions_wow_pct;
  if (pct == null) return null;
  const worsening = pct > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
      worsening ? 'bg-[var(--negative-soft)] text-[var(--negative)]' : 'bg-[var(--positive-soft)] text-[var(--positive)]'
    }`}>
      {worsening ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(0)}% WoW
    </span>
  );
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
        const complaint = topComplaintTheme(report);
        return {
          product,
          displayName: manifest.products[product]?.display_name || product,
          color: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
          rating: report.average_rating || 0,
          reviews: report.counts?.reviews || 0,
          onestar: onestarPct(report),
          sources: sourceSplit(report),
          complaint: complaint ? { name: parseThemeName(complaint.name).name, mentions: complaint.quotes?.length || complaint.mentions_count || 0, priority: complaint.priority_score, trend: complaint.trend } : null,
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

  // Shared pain points: bucket every NEGATIVE theme, this week, across all
  // products, into cross-app categories — answers "who else has this problem?"
  const painMatrix = useMemo(() => {
    if (!data || !activeWeek) return { rows: [], appsWithData: [] };
    const grid = {}; // categoryId -> product -> { mentions, priority }
    products.forEach(product => {
      const report = data[product]?.[activeWeek];
      (report?.themes || []).forEach(theme => {
        const { sentiment, name } = parseThemeName(theme.name);
        if (sentiment !== 'negative') return;
        const cat = categorizeTheme(theme.theme_id, name);
        if (!grid[cat.id]) grid[cat.id] = { label: cat.label, apps: {} };
        const existing = grid[cat.id].apps[product];
        const mentions = theme.quotes?.length || theme.mentions_count || 0;
        if (!existing || mentions > existing.mentions) {
          grid[cat.id].apps[product] = { mentions, priority: theme.priority_score || 0 };
        }
      });
    });
    const rows = Object.entries(grid)
      .map(([id, v]) => ({ id, ...v, appCount: Object.keys(v.apps).length }))
      .filter(r => r.appCount >= 2) // only genuinely shared pain points
      .sort((a, b) => b.appCount - a.appCount);
    return { rows };
  }, [data, products, activeWeek]);

  // Which teams are under the most complaint pressure across every app, this week
  const teamPressure = useMemo(() => {
    if (!data || !activeWeek) return [];
    const tally = {};
    products.forEach(product => {
      const report = data[product]?.[activeWeek];
      (report?.themes || []).forEach(theme => {
        const { sentiment } = parseThemeName(theme.name);
        if (sentiment !== 'negative') return;
        const weight = theme.quotes?.length || theme.mentions_count || 1;
        (theme.teams_impacted || []).forEach(team => {
          tally[team] = (tally[team] || 0) + weight;
        });
      });
    });
    const max = Math.max(1, ...Object.values(tally));
    return Object.entries(tally)
      .map(([team, mentions]) => ({ team, mentions, pct: (mentions / max) * 100 }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 7);
  }, [data, products, activeWeek]);

  if (loading) return <div className="py-20 text-center text-[var(--text-secondary)]">Loading comparison…</div>;
  if (error) return <div className="py-20 text-center text-[var(--negative)]">{error}</div>;
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
          {commonWeeks.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      {/* Enriched ranked cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div
            key={c.product}
            className="bg-[var(--bg-card)] rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: c.color }} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">#{i + 1}</span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">{c.reviews.toLocaleString()} reviews</span>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{c.displayName}</h3>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-3xl font-bold" style={{ color: getRatingColor(c.rating) }}>{c.rating.toFixed(2)}</span>
              <Star className="w-5 h-5 mt-1" fill={getRatingColor(c.rating)} stroke={getRatingColor(c.rating)} />
            </div>
            {c.onestar != null && (
              <div className="text-xs text-[var(--text-secondary)] mb-3">
                <span className={c.onestar > 20 ? 'text-[var(--negative)] font-semibold' : ''}>
                  {c.onestar.toFixed(0)}% are 1-star
                </span>
                {c.sources.length > 0 && (
                  <span className="ml-2 text-[var(--text-tertiary)]">
                    · {c.sources.map(s => `${s.source === 'app_store' ? 'App' : s.source === 'play_store' ? 'Play' : s.source} ${s.pct}%`).join(' · ')}
                  </span>
                )}
              </div>
            )}
            {c.complaint && (
              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-start gap-2">
                  <MessageSquareWarning className="w-4 h-4 text-[var(--negative)] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-0.5">Top complaint</div>
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">{c.complaint.name}</div>
                    <div className="text-xs text-[var(--text-secondary)] mb-1.5">
                      {c.complaint.mentions} mentions{c.complaint.priority != null && ` · priority ${c.complaint.priority}`}
                    </div>
                    <TrendBadge trend={c.complaint.trend} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rating trend */}
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
              <Legend formatter={name => manifest.products[name]?.display_name || name} wrapperStyle={{ fontSize: 13 }} />
              {products.map((product, i) => (
                <Line key={product} type="monotone" dataKey={product} stroke={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 2, fill: 'var(--bg-card)' }} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Shared pain points — the cross-app market insight */}
      <div className="bg-[var(--bg-card)] rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-sm)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Shared pain points this week</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Problem categories showing up as a top complaint in 2 or more apps at once — not one app's noise, an industry pattern.
        </p>
        {painMatrix.rows.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] italic">No category was a shared top complaint across multiple apps this week.</p>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[var(--text-tertiary)] text-xs uppercase tracking-wide">
                  <th className="pb-3 pr-4 font-medium">Category</th>
                  {products.map((p, i) => (
                    <th key={p} className="pb-3 px-3 font-medium text-center" style={{ color: PRODUCT_COLORS[i % PRODUCT_COLORS.length] }}>
                      {manifest.products[p]?.display_name || p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {painMatrix.rows.map(row => (
                  <tr key={row.id} className="border-t border-[var(--border-subtle)]">
                    <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">{row.label}</td>
                    {products.map(p => {
                      const cell = row.apps[p];
                      return (
                        <td key={p} className="py-3 px-3 text-center">
                          {cell ? (
                            <span className="inline-flex flex-col items-center">
                              <span className="w-2.5 h-2.5 rounded-full bg-[var(--negative)] mb-1" />
                              <span className="text-xs text-[var(--text-secondary)]">{cell.mentions}</span>
                            </span>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Team pressure rollup */}
      <div className="bg-[var(--bg-card)] rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2 mb-1">
          <Users2 className="w-5 h-5 text-[var(--text-secondary)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Where the pressure is landing</h3>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Complaint mentions attributed to each team, tallied across all four apps this week.
        </p>
        <div className="space-y-3">
          {teamPressure.map(t => (
            <div key={t.team} className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-primary)] w-40 shrink-0 truncate">{t.team}</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${t.pct}%` }} />
              </div>
              <span className="text-xs font-medium text-[var(--text-secondary)] w-16 text-right shrink-0">{t.mentions} mentions</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
