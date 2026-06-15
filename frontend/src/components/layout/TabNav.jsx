export function TabNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'themes', label: 'Themes' },
    { id: 'trends', label: 'Trends' },
    { id: 'report', label: 'Report' }
  ];

  return (
    <div className="sticky top-[104px] md:top-16 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] -mx-4 md:mx-0 px-4 md:px-0">
      <div className="max-w-[1200px] mx-auto md:px-6">
        <nav className="flex space-x-8 overflow-x-auto no-scrollbar snap-x snap-mandatory" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors snap-start shrink-0
                  ${isActive 
                    ? 'border-[var(--accent)] text-[var(--accent)]' 
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'}
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
