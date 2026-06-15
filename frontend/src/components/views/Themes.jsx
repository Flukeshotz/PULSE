import { useState, useEffect } from 'react';
import { AlertTriangle, Search, Lightbulb, Quote, Star, Users, Code, Paintbrush, Headphones, Layers } from 'lucide-react';
import { SentimentBadge } from '../shared/SentimentBadge';
import { parseThemeName, formatSourceName } from '../../utils/format';
import { getSentimentBgClass, getSourceColor, getRatingColor } from '../../utils/colors';

// Helper for team icons
const getTeamIcon = (team) => {
  const t = team.toLowerCase();
  if (t.includes('eng') || t.includes('dev')) return Code;
  if (t.includes('design') || t.includes('ux') || t.includes('ui')) return Paintbrush;
  if (t.includes('support') || t.includes('customer')) return Headphones;
  return Users;
};

export function Themes({ report }) {
  const themes = report?.themes || [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sortBy, setSortBy] = useState('rank');
  const [quotesExpanded, setQuotesExpanded] = useState(false);

  // Reset selection if report changes
  useEffect(() => {
    setSelectedIdx(0);
    setQuotesExpanded(false);
  }, [report, sortBy]);
  
  const sortedThemes = [...themes].sort((a, b) => {
    if (sortBy === 'mentions') return (b.mentions_count || 0) - (a.mentions_count || 0);
    if (sortBy === 'lowest_rated') return (a.average_rating || 5) - (b.average_rating || 5);
    if (sortBy === 'highest_confidence') return (b.confidence_score || 0) - (a.confidence_score || 0);
    return a.rank - b.rank; // rank
  });

  if (themes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
        <Layers className="w-16 h-16 mb-4 text-[var(--text-tertiary)] opacity-50" />
        <p>No themes found for this report.</p>
      </div>
    );
  }

  const selectedTheme = sortedThemes[selectedIdx] || sortedThemes[0];
  const { sentiment, name } = parseThemeName(selectedTheme.name);
  const actionItems = selectedTheme.action_plan ? selectedTheme.action_plan.split('\n').map(s => s.replace(/^[•\-]\s*/, '').trim()).filter(Boolean) : [];

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-12 animate-in fade-in duration-300">
      
      {/* LEFT PANEL / TOP PILLS: Theme List */}
      <div className="w-full lg:w-1/3 shrink-0">
        
        {/* Sort Controls */}
        <div className="mb-4 px-4 md:px-0">
          <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2 block">Sort By</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm rounded-md px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors"
          >
            <option value="rank">Default (Rank)</option>
            <option value="mentions">Most Mentioned</option>
            <option value="lowest_rated">Lowest Rated</option>
            <option value="highest_confidence">Highest Confidence</option>
          </select>
        </div>

        <div className="sticky top-[104px] md:top-32 space-x-2 md:space-x-0 space-y-0 lg:space-y-2 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 snap-x snap-mandatory lg:snap-none no-scrollbar -mx-4 md:mx-0 px-4 md:px-0">
          {sortedThemes.map((theme, idx) => {
            const parsed = parseThemeName(theme.name);
            const isActive = idx === selectedIdx;
            
            // Get a dot color based on sentiment
            let dotColor = 'var(--neutral-sentiment)';
            if (parsed.sentiment?.toLowerCase() === 'positive') dotColor = 'var(--positive)';
            if (parsed.sentiment?.toLowerCase() === 'negative') dotColor = 'var(--negative)';

            return (
              <button
                key={idx}
                onClick={() => setSelectedIdx(idx)}
                className={`text-left flex items-center p-3 rounded-full lg:rounded-md transition-all snap-start shrink-0 lg:w-full min-w-[200px] lg:min-w-0 ${
                  isActive 
                    ? 'bg-[var(--accent-soft)] lg:border-l-4 lg:border-[var(--accent)] border border-[var(--accent)] lg:border-t-0 lg:border-r-0 lg:border-b-0' 
                    : 'bg-[var(--bg-elevated)] lg:bg-transparent lg:border-l-4 lg:border-transparent border border-transparent hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <span className="w-6 text-xs lg:text-sm font-semibold text-[var(--text-tertiary)] shrink-0">#{idx + 1}</span>
                <span className="w-2 h-2 rounded-full mr-2 lg:mr-3 shrink-0" style={{ backgroundColor: dotColor }} />
                <span className={`text-xs md:text-sm font-medium truncate ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                  {parsed.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL: Theme Detail */}
      <div className="w-full lg:w-2/3 space-y-6">
        
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            {sentiment && <SentimentBadge sentiment={sentiment} />}
            <span className="px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold uppercase tracking-wider">
              Rank #{selectedTheme.rank}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">{name}</h2>
          
          {/* Metadata Section */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4 bg-[var(--bg-elevated)] rounded-[var(--radius-md)] mb-6 border border-[var(--border-subtle)]">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Mentions</span>
              <span className="text-lg font-bold text-[var(--text-primary)]">{selectedTheme.mentions_count || 0} reviews</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Avg Rating</span>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-lg font-bold text-[var(--text-primary)]">{selectedTheme.average_rating || '-'}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Confidence</span>
              <span className="text-lg font-bold text-[var(--text-primary)]">{selectedTheme.confidence_score ? `${Math.round(selectedTheme.confidence_score * 100)}%` : '-'}</span>
            </div>
            
            {/* Rating Distribution */}
            {selectedTheme.rating_distribution && (
              <div className="flex flex-col w-full md:w-auto md:ml-auto mt-2 md:mt-0">
                <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Distribution</span>
                <div className="flex items-center gap-3">
                  {[5,4,3,2,1].map(star => {
                    const count = selectedTheme.rating_distribution[star] || 0;
                    const total = selectedTheme.mentions_count || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={star} className="flex flex-col items-center group relative cursor-default">
                        <span className="text-xs font-medium text-[var(--text-secondary)]">{star}★</span>
                        <span className="text-xs text-[var(--text-tertiary)]">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Impact & Hypothesis */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[var(--bg-elevated)] rounded-[var(--radius-md)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">Business Impact</h3>
            </div>
            <p className="text-[var(--text-primary)] leading-relaxed">{selectedTheme.business_impact}</p>
          </div>

          <div className="bg-[var(--bg-elevated)] rounded-[var(--radius-md)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">Root Cause Hypothesis</h3>
            </div>
            <p className="text-[var(--text-primary)] leading-relaxed">{selectedTheme.root_cause_hypothesis || "Not specified."}</p>
          </div>
        </div>

        {/* Action Plan */}
        <div className="bg-[var(--bg-card)] rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-sm)] border-l-4 border-[var(--accent)]">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Action Plan</h3>
          </div>
          <ul className="space-y-3">
            {actionItems.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Impacted Teams */}
        <div className="flex items-center flex-wrap gap-2 pt-2">
          <span className="text-sm font-medium text-[var(--text-tertiary)] mr-2">Impacted Teams:</span>
          {selectedTheme.teams_impacted?.map(team => {
            const TeamIcon = getTeamIcon(team);
            return (
              <span key={team} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] text-xs font-medium text-[var(--text-primary)]">
                <TeamIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                {team}
              </span>
            );
          })}
        </div>

        {/* Voice of Customer */}
        <div className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Quote className="w-5 h-5 text-[var(--text-primary)]" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Voice of the Customer</h3>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-medium">
              {selectedTheme.quotes?.length || 0} validated
            </span>
          </div>

          {(!selectedTheme.quotes || selectedTheme.quotes.length === 0) ? (
            <p className="text-[var(--text-secondary)] italic">No quotes met the validation threshold this week.</p>
          ) : (
            <div className="space-y-4">
              {selectedTheme.quotes
                .slice(0, quotesExpanded ? selectedTheme.quotes.length : 3)
                .map(q => typeof q === 'string' ? { text: q, source: null, rating: null } : q)
                .map((q, i) => (
                <div key={i} className="bg-[var(--bg-card)] dark:bg-[var(--bg-elevated)] rounded-[var(--radius-md)] p-5 shadow-[var(--shadow-sm)] relative overflow-hidden">
                  <div className="absolute -top-3 -left-1 text-6xl font-serif text-[var(--text-tertiary)] opacity-[0.08] select-none pointer-events-none">"</div>
                  
                  <p className="text-base font-medium text-[var(--text-primary)] leading-relaxed mb-4 relative z-10 pl-2">
                    "{q.text}"
                  </p>
                  
                  <div className="flex items-center gap-4 border-t border-[var(--border-subtle)] pt-3 mt-3 relative z-10">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getSourceColor(q.source) }} />
                      <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        {q.source ? formatSourceName(q.source) : 'Review'}
                      </span>
                    </div>
                    {q.rating && (
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(star => (
                          <Star 
                            key={star} 
                            className="w-3.5 h-3.5" 
                            fill={star <= q.rating ? getRatingColor(q.rating) : 'transparent'} 
                            stroke={star <= q.rating ? getRatingColor(q.rating) : 'var(--border-subtle)'}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {!quotesExpanded && selectedTheme.quotes.length > 3 && (
                <button 
                  onClick={() => setQuotesExpanded(true)}
                  className="w-full py-3 mt-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                >
                  View {selectedTheme.quotes.length - 3} More Quotes
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
