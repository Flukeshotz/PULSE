import { useState, useEffect } from 'react';

export function useTrendData(manifest, selectedProduct) {
  const [data, setData] = useState([]);
  const [themeMap, setThemeMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!manifest || !selectedProduct) {
      setData([]);
      setThemeMap({});
      return;
    }

    const weeks = manifest.products[selectedProduct]?.weeks || [];
    if (weeks.length === 0) {
      setData([]);
      setThemeMap({});
      return;
    }

    setLoading(true);
    
    // Fetch all weeks for the product
    const fetchPromises = weeks.map(week => 
      fetch(`/data/${selectedProduct}/${week}.json`)
        .then(res => res.ok ? res.json() : null)
        .catch(err => null)
    );

    // Also fetch the theme_map.json
    const mapPromise = fetch(`/data/${selectedProduct}/theme_map.json`)
      .then(res => res.ok ? res.json() : {})
      .catch(err => ({}));

    Promise.all([Promise.all(fetchPromises), mapPromise])
      .then(([results, mapResult]) => {
        // Filter out failed fetches and sort chronologically (oldest first for charts)
        const validData = results.filter(Boolean).sort((a, b) => {
          return a.iso_week.localeCompare(b.iso_week);
        });
        setData(validData);
        setThemeMap(mapResult || {});
        setError(null);
      })
      .catch(err => {
        setError("Failed to load trend data");
      })
      .finally(() => {
        setLoading(false);
      });

  }, [manifest, selectedProduct]);

  return { data, themeMap, loading, error };
}
