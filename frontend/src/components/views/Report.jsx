import { ExternalLink, Printer } from 'lucide-react';
import { parseThemeName, formatSourceName } from '../../utils/format';
import { SentimentBadge } from '../shared/SentimentBadge';

export function Report({ report }) {
  if (!report) return null;

  const handlePrint = () => {
    window.print();
  };

  const themes = report.themes || [];
  const sources = report.sources_covered || [];
  const totalReviews = report.counts?.reviews || 0;
  
  // Executive Summary text logic
  const topThemesText = themes.slice(0, 2).map(t => parseThemeName(t.name).name).join('", followed by "');

  return (
    <div className="w-full max-w-[720px] mx-auto py-6 md:py-8 px-4 md:px-0 animate-in fade-in duration-300">
      
      {/* Header Block */}
      <header className="mb-8 md:mb-12 border-b border-[var(--border-subtle)] pb-6 md:pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
          {report.product} Pulse: {report.iso_week}
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mb-6">
          Window: {report.period_label} | {totalReviews} reviews analyzed | {sources.length} sources
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 print:hidden">
          <button 
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-md text-sm font-medium hover:bg-[var(--border-subtle)] transition-colors"
            onClick={() => window.open(`https://docs.google.com/document/d/fake-doc-id`, '_blank')} // We don't have the real doc ID here unfortunately, we can fallback
          >
            <ExternalLink className="w-4 h-4" />
            Open in Google Docs
          </button>
          <button 
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-md text-sm font-medium hover:bg-[var(--border-subtle)] transition-colors"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </header>

      {/* Executive Summary */}
      <section className="mb-12">
        <p className="text-lg text-[var(--text-primary)] leading-relaxed">
          This week's analysis of {totalReviews} reviews across {sources.join(', ')} surfaced {themes.length} themes. 
          {themes.length > 0 && ` The top concern is "${topThemesText}".`}
        </p>
      </section>

      {/* Themes */}
      <div className="space-y-16">
        {themes.map((theme, idx) => {
          const { sentiment, name } = parseThemeName(theme.name);
          const actionItems = theme.action_plan ? theme.action_plan.split('\n').map(s => s.replace(/^[•\-]\s*/, '').trim()).filter(Boolean) : [];

          return (
            <article key={idx} className="break-inside-avoid">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {idx + 1}. {name}
                </h2>
                {sentiment && <SentimentBadge sentiment={sentiment} />}
              </div>
              
              <p className="text-base text-[var(--text-primary)] leading-relaxed mb-6">
                <span className="font-semibold text-[var(--text-secondary)] mr-2">Description:</span>
                {theme.description}
              </p>

              <div className="bg-[var(--bg-elevated)] border-l-4 border-[var(--accent)] p-4 mb-4 rounded-r-md">
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide mb-2">Business Impact</h3>
                <p className="text-sm text-[var(--text-primary)]">{theme.business_impact}</p>
              </div>

              {theme.root_cause_hypothesis && (
                <div className="bg-[var(--bg-elevated)] border-l-4 border-indigo-500 p-4 mb-6 rounded-r-md">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide mb-2">Root Cause Hypothesis</h3>
                  <p className="text-sm text-[var(--text-primary)]">{theme.root_cause_hypothesis}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide mb-2">Action Plan</h3>
                <ul className="list-disc pl-5 space-y-2 text-base text-[var(--text-primary)]">
                  {actionItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="mb-6">
                <span className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide mr-2">Impacted Teams:</span>
                <span className="text-base text-[var(--text-primary)]">{theme.teams_impacted?.join(', ')}</span>
              </div>

              {theme.quotes && theme.quotes.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide mb-4">Voice of the Customer</h3>
                  <div className="space-y-6">
                    {theme.quotes.map(q => typeof q === 'string' ? { text: q, source: null, rating: null } : q).map((q, i) => (
                      <blockquote key={i} className="border-l-4 border-[var(--accent)] pl-3 md:pl-5 italic text-[var(--text-secondary)]">
                        <p className="mb-2 text-base leading-relaxed text-[var(--text-primary)]">"{q.text}"</p>
                        <footer className="text-sm">
                          — {q.source ? formatSourceName(q.source) : 'Review'} {q.rating ? `, ${'★'.repeat(q.rating)}${'☆'.repeat(5-q.rating)}` : ''}
                        </footer>
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <footer className="mt-16 pt-8 border-t border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)] text-center">
        Generated at {new Date(report.generated_at).toLocaleString()}
      </footer>

    </div>
  );
}
