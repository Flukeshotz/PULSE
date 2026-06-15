import { Moon, Sun, ChevronDown } from 'lucide-react';
import { useDarkMode } from '../../hooks/useDarkMode';

export function TopBar({ manifest, selectedProduct, setSelectedProduct, selectedWeek, setSelectedWeek }) {
  const [isDark, toggleDark] = useDarkMode();

  const products = manifest?.products ? Object.keys(manifest.products) : [];
  const currentProductData = manifest?.products?.[selectedProduct];
  const weeks = currentProductData?.weeks || [];

  return (
    <div className="sticky top-0 z-50 min-h-16 py-3 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] px-4 md:px-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-4 md:gap-8 w-full md:w-auto">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-xl font-bold text-[var(--accent)] tracking-tight">Review Pulse</h1>
          <button 
            onClick={toggleDark}
            className="md:hidden p-2 rounded-full hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
          {/* Product Selector */}
          <div className="relative flex-1 md:flex-none">
            <select 
              className="appearance-none w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-medium rounded-md pl-3 md:pl-4 pr-10 py-2 outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer"
              value={selectedProduct || ''}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              {products.map(p => (
                <option key={p} value={p}>{manifest.products[p].display_name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
          </div>

          {/* Week Selector */}
          <div className="relative flex-1 md:flex-none">
            <select 
              className="appearance-none w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-medium rounded-md pl-3 md:pl-4 pr-10 py-2 outline-none focus:border-[var(--border-focus)] transition-colors cursor-pointer"
              value={selectedWeek || ''}
              onChange={(e) => setSelectedWeek(e.target.value)}
            >
              {weeks.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
          </div>
        </div>
      </div>

      <button 
        onClick={toggleDark}
        className="hidden md:block p-2 rounded-full hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        aria-label="Toggle dark mode"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </div>
  );
}
