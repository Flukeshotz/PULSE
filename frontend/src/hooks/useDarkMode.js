import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial state from html class (if any) or media query
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isHtmlDark = document.documentElement.classList.contains('dark');
    setIsDark(isHtmlDark || isSystemDark);
    
    if (isSystemDark && !isHtmlDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  return [isDark, toggle];
}
