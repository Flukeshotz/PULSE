import { useRef } from 'react';
import { FileText, Database, Layers, Quote, AlertCircle, TrendingDown, TrendingUp, Minus, ChevronRight, ChevronLeft, Star } from 'lucide-react';
import { StatCard } from '../shared/StatCard';
import { SourceDonut } from '../charts/SourceDonut';
import { RatingBars } from '../charts/RatingBars';
import { SentimentBadge } from '../shared/SentimentBadge';
import { parseThemeName, formatSourceName } from '../../utils/format';
import { getSentimentBgClass, getSourceColor, getRatingColor } from '../../utils/colors';

export function Overview({ report, setActiveTab }) {
  if (!report) return null;

  const counts = report.counts || {};
  const totalValidated = report.themes?.reduce((acc, t) => acc + (t.quotes?.length || 0), 0) || 0;

  const carouselRef = useRef(null);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 340 + 24; // Card width + gap
      carouselRef.current.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* SECTION A: STATS RIBBON */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <StatCard title="Analyzed" value={counts.reviews} subtitle="Reviews" icon={FileText} />
        <StatCard title="Sources" value={report.sources_covered?.length} subtitle="Covered" icon={Database} />
        <StatCard title="Themes" value={report.themes?.length} subtitle="Found" icon={Layers} />
        <StatCard title="Validated" value={totalValidated} subtitle="Quotes" icon={Quote} />
        <div className="col-span-2 md:col-span-1">
          <StatCard 
            title="DROPPED — Invalid quotes" 
            value={(counts?.unauthentic_quotes_dropped || 0) + (counts?.irrelevant_quotes_dropped || 0)} 
            subtitle="Excluded by AI Validation"
            icon={AlertCircle}
            valueColor={((counts?.unauthentic_quotes_dropped || 0) + (counts?.irrelevant_quotes_dropped || 0)) > 0 ? 'text-[var(--negative)]' : 'text-[var(--positive)]'} 
          />
        </div>
      </div>

      {/* SECTION B: CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        <div className="w-full md:col-span-5">
          <SourceDonut report={report} />
        </div>
        <div className="w-full md:col-span-7">
          <RatingBars report={report} />
        </div>
      </div>

      {/* SECTION C: PRIMARY THEMES */}
      <section>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Primary Themes</h2>
          <button 
            onClick={() => setActiveTab('themes')}
            className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            View all {report.themes?.length} themes &rarr;
          </button>
        </div>
        <div className="space-y-4">
          {report.themes?.slice(0, 5).map((theme, i) => {
            const { sentiment, name } = parseThemeName(theme.name);
            const isPos = sentiment?.toLowerCase() === 'positive';
            const isNeg = sentiment?.toLowerCase() === 'negative';
            
            const Icon = isPos ? TrendingUp : (isNeg ? TrendingDown : Minus);
            const iconBg = isPos ? 'bg-[var(--positive-soft)] text-[var(--positive)]' : (isNeg ? 'bg-[var(--negative-soft)] text-[var(--negative)]' : 'bg-[var(--neutral-soft)] text-[var(--neutral-sentiment)]');

            return (
              <div 
                key={i} 
                onClick={() => setActiveTab('themes')}
                className="group flex flex-col md:flex-row items-start p-4 md:p-6 bg-[var(--bg-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[1px] transition-all cursor-pointer relative"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
              >
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center mb-4 md:mb-0 md:mr-6 ${iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-2 pr-12 md:pr-0">
                    {sentiment && <div className="mt-1"><SentimentBadge sentiment={sentiment} /></div>}
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] leading-tight">{name}</h3>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 pr-12 md:pr-0 leading-relaxed">
                    {theme.description}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1.5">
                      <Quote className="w-3.5 h-3.5" />
                      {theme.quotes?.length || 0} validated
                    </div>
                    <div className="hidden md:block w-px h-3 bg-[var(--border-subtle)]" />
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-tertiary)] uppercase tracking-wider">Teams</span>
                      <div className="flex flex-wrap gap-2">
                        {theme.teams_impacted?.map(t => (
                          <span key={t} className="px-2 py-1 bg-[var(--bg-elevated)] rounded-full text-[var(--text-primary)]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-4 right-4 md:static md:ml-4 shrink-0 flex items-center justify-center w-10 h-10 rounded-full group-hover:bg-[var(--bg-elevated)] transition-colors self-start md:self-center">
                  <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION D: HIGHLIGHT QUOTES CAROUSEL */}
      <section className="pt-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Highlight Quotes</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => scrollCarousel(-1)}
              className="p-2 border border-[var(--border-subtle)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => scrollCarousel(1)}
              className="p-2 border border-[var(--border-subtle)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div 
          ref={carouselRef}
          className="flex overflow-x-auto gap-4 md:gap-6 pb-4 snap-x snap-mandatory no-scrollbar -mx-4 md:mx-0 px-4 md:px-0 scroll-smooth"
        >
          {report.themes?.flatMap(t => {
            const rawQuotes = t.quotes || [];
            return rawQuotes.map(q => 
              typeof q === 'string' ? { text: q, source: null, rating: null } : q
            );
          }).slice(0, 8).map((q, i) => {
            const isFirst = i === 0;
            return (
              <div 
                key={i} 
                className={`snap-center md:snap-start shrink-0 w-[85vw] md:w-[340px] rounded-[var(--radius-lg)] p-5 md:p-6 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all relative overflow-hidden flex flex-col
                  ${isFirst ? 'bg-[var(--accent-soft)]' : 'bg-[var(--bg-card)]'}`}
              >
                <div className="absolute -top-4 -left-2 text-7xl font-serif text-[var(--text-tertiary)] opacity-[0.08] select-none pointer-events-none">"</div>
                
                <div className="flex justify-between items-center mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getSourceColor(q.source) }} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-2.5 py-0.5 rounded-full">
                      {q.source ? formatSourceName(q.source) : 'Review'}
                    </span>
                  </div>
                </div>
                
                <p className={`text-base font-medium leading-relaxed flex-1 mb-6 relative z-10 line-clamp-4 ${isFirst ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                  "{q.text}"
                </p>
                
                {q.rating ? (
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(star => (
                      <Star 
                        key={star} 
                        className="w-4 h-4" 
                        fill={star <= q.rating ? getRatingColor(q.rating) : 'transparent'} 
                        stroke={star <= q.rating ? getRatingColor(q.rating) : 'var(--border-subtle)'}
                      />
                    ))}
                  </div>
                ) : (
                   <div className="h-4"></div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
