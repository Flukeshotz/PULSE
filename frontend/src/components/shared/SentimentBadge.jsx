import { getSentimentBgClass } from '../../utils/colors';

export function SentimentBadge({ sentiment, className = '' }) {
  if (!sentiment) return null;
  const bgClass = getSentimentBgClass(sentiment);
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold uppercase tracking-wider ${bgClass} ${className}`}>
      [{sentiment}]
    </span>
  );
}
