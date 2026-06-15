import { useCountUp } from '../../hooks/useCountUp';

export function StatCard({ title, value, subtitle, icon: Icon, valueColor }) {
  const displayValue = useCountUp(typeof value === 'number' ? value : 0);
  
  return (
    <div className="bg-[var(--bg-card)] rounded-[var(--radius-md)] p-4 md:p-6 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all flex flex-col min-h-[105px] md:min-h-0">
      <div className="flex items-center text-[var(--text-secondary)] mb-2">
        <Icon className="w-5 h-5 mr-2 shrink-0" />
        <span className="uppercase text-xs font-medium tracking-wide truncate">{title}</span>
      </div>
      <div className={`text-2xl md:text-3xl font-bold mb-1 ${valueColor || 'text-[var(--text-primary)]'}`}>
        {typeof value === 'number' ? displayValue : value}
      </div>
      {subtitle && (
        <div className="text-xs md:text-sm text-[var(--text-secondary)] truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
}
