import { parseThemeName } from '../../utils/format';

export function ThemeHeatmap({ data, themeMapData = {} }) {
  if (!data || data.length === 0) return null;

  // 1. Collect all unique theme names across all weeks
  const themeMap = new Map(); // name -> { totalPresent: 0, weeks: {} }
  
  data.forEach((report, weekIdx) => {
    const weekLabel = report.iso_week.split('-')[1]; // W24
    
    report.themes?.forEach((theme, rank) => {
      const { name } = parseThemeName(theme.name);
      
      // Use canonical name from precomputed fuzzy match map if available
      let key = themeMapData[name] || name;
      
      if (!themeMap.has(key)) {
        themeMap.set(key, { 
          displayName: key, 
          totalPresent: 0, 
          weeks: {} 
        });
      }
      
      const record = themeMap.get(key);
      record.weeks[weekLabel] = {
        present: true,
        rank: rank + 1,
        quotes: theme.quotes?.length || 0,
        themeData: theme
      };
      record.totalPresent += 1;
    });
  });

  // 2. Sort rows by persistence (number of weeks present)
  const sortedThemes = Array.from(themeMap.values()).sort((a, b) => {
    const aCount = Object.keys(a.weeks).length;
    const bCount = Object.keys(b.weeks).length;
    return bCount - aCount;
  });
  
  const weekLabels = data.map(d => d.iso_week.split('-')[1]);
  const totalWeeks = weekLabels.length;

  return (
    <div className="bg-[var(--bg-card)] rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-sm)] mt-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">Theme Persistence</h3>
        <p className="text-sm text-[var(--text-secondary)]">Tracking theme recurrence across {totalWeeks} weeks</p>
      </div>

      <div className="overflow-x-auto pb-4 no-scrollbar">
        <div className="min-w-[600px]">
          
          {/* Header Row */}
          <div className="flex border-b border-[var(--border-subtle)] pb-2 mb-2 bg-[var(--bg-card)] sticky top-0 z-20">
            <div className="w-[180px] md:w-[40%] shrink-0 text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider pl-2 sticky left-0 bg-[var(--bg-card)] z-30 shadow-[1px_0_0_0_var(--border-subtle)]">
              Theme
            </div>
            <div className="flex-1 flex px-4">
              {weekLabels.map(w => (
                <div key={w} className="w-[60px] md:flex-1 text-center text-xs font-bold text-[var(--text-secondary)]">{w}</div>
              ))}
            </div>
            <div className="w-[80px] md:w-[15%] text-right text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider pr-2">
              Persistence
            </div>
          </div>

          {/* Data Rows */}
          {sortedThemes.map((t, idx) => (
            <div 
              key={idx} 
              className={`flex items-center py-2 rounded-md hover:bg-[var(--bg-elevated)] transition-colors group
                ${idx % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-primary)]'}
              `}
            >
              {/* Theme Name */}
              <div className="w-[180px] md:w-[40%] shrink-0 pr-4 pl-2 truncate relative group/tooltip sticky left-0 z-10 bg-inherit shadow-[1px_0_0_0_var(--border-subtle)]">
                <span className="text-sm font-medium text-[var(--text-primary)]">{t.displayName}</span>
                {/* Tooltip for long names */}
                <div className="absolute left-4 -top-8 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs px-2 py-1 rounded shadow-md opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">
                  {t.displayName}
                </div>
              </div>

              {/* Week Columns */}
              <div className="flex-1 flex px-4">
                {weekLabels.map(w => {
                  const cell = t.weeks[w];
                  
                  if (!cell) {
                    return (
                      <div key={w} className="w-[60px] md:flex-1 flex justify-center items-center">
                        <div className="w-3 h-3 rounded-full border-[1.5px] border-[var(--border-subtle)]"></div>
                      </div>
                    );
                  }

                  // It is present
                  const opacity = Math.max(0.3, 1 - ((cell.rank - 1) * 0.15));
                  const size = Math.max(10, 16 - ((cell.rank - 1) * 1.5));
                  
                  return (
                    <div key={w} className="w-[60px] md:flex-1 flex justify-center items-center relative group/cell">
                      <div 
                        className="rounded-full bg-[var(--accent)] transition-transform hover:scale-125 cursor-pointer shadow-sm"
                        style={{ width: `${size}px`, height: `${size}px`, opacity }}
                      />
                      
                      {/* Cell Tooltip */}
                      <div className="absolute bottom-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded shadow-md p-2 opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-opacity z-20 w-32 left-1/2 -translate-x-1/2">
                        <div className="text-xs font-bold text-[var(--accent)] mb-1">Rank #{cell.rank}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{cell.quotes} quotes</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Persistence Bar */}
              <div className="w-[80px] md:w-[15%] flex justify-end items-center pr-2 shrink-0">
                <span className="text-xs text-[var(--text-secondary)] mr-1 md:mr-2">{Object.keys(t.weeks).length}/{totalWeeks}</span>
                <div className="hidden md:block w-12 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--accent)]" 
                    style={{ width: `${(Object.keys(t.weeks).length / totalWeeks) * 100}%` }}
                  />
                </div>
              </div>

            </div>
          ))}

        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)] flex justify-between">
        <span>Darker/larger circles indicate higher ranking themes</span>
        <span>Empty circles indicate theme absence</span>
      </div>
    </div>
  );
}
