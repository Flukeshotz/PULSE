export const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

export function parseThemeName(themeName) {
  if (!themeName) return { sentiment: null, name: '' };
  
  const match = themeName.match(/^\[(Negative|Positive|Neutral)\]\s*/i);
  if (match) {
    return {
      sentiment: match[1].toLowerCase(),
      name: themeName.replace(match[0], '')
    };
  }
  
  return {
    sentiment: null,
    name: themeName
  };
}

export const formatSourceName = (source) => {
  if (source === 'app_store') return 'App Store';
  if (source === 'play_store') return 'Play Store';
  if (source === 'reddit') return 'Reddit';
  return source;
};
