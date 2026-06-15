// We map tailwind theme variables if needed, but mostly we use Tailwind classes.
export const getSentimentColor = (sentiment) => {
  if (!sentiment) return 'var(--neutral-sentiment)';
  const s = sentiment.toLowerCase();
  if (s.includes('positive')) return 'var(--positive)';
  if (s.includes('negative')) return 'var(--negative)';
  return 'var(--neutral-sentiment)';
};

export const getSentimentBgClass = (sentiment) => {
  if (!sentiment) return 'bg-[var(--neutral-soft)] text-[var(--neutral-sentiment)]';
  const s = sentiment.toLowerCase();
  if (s.includes('positive')) return 'bg-[var(--positive-soft)] text-[var(--positive)]';
  if (s.includes('negative')) return 'bg-[var(--negative-soft)] text-[var(--negative)]';
  return 'bg-[var(--neutral-soft)] text-[var(--neutral-sentiment)]';
};

export const getSourceColor = (source) => {
  if (!source) return '#9CA3AF';
  if (source.includes('app_store')) return 'var(--source-appstore)';
  if (source.includes('play_store')) return 'var(--source-playstore)';
  return '#9CA3AF';
};

export const getRatingColor = (rating) => {
  if (rating >= 4.5) return 'var(--star-5)';
  if (rating >= 3.5) return 'var(--star-4)';
  if (rating >= 2.5) return 'var(--star-3)';
  if (rating >= 1.5) return 'var(--star-2)';
  return 'var(--star-1)';
};
