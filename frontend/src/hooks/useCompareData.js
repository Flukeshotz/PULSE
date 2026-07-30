import { useState, useEffect } from 'react';

// Fetches every product's report across the weeks they ALL have in common,
// so any comparison shown is genuinely apples-to-apples (never comparing a
// product's week 30 against another's week 26).
export function useCompareData(manifest) {
  const [data, setData] = useState(null); // { [product]: { [week]: report } }
  const [commonWeeks, setCommonWeeks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!manifest) return;

    const allProducts = Object.keys(manifest.products || {});
    if (allProducts.length === 0) {
      setLoading(false);
      return;
    }

    // Intersection of weeks across every product
    const weekSets = allProducts.map(p => new Set(manifest.products[p].weeks || []));
    const shared = (manifest.products[allProducts[0]].weeks || []).filter(w =>
      weekSets.every(set => set.has(w))
    );
    const sortedShared = [...shared].sort(); // ascending, e.g. W26 -> W30

    if (sortedShared.length === 0) {
      setProducts(allProducts);
      setCommonWeeks([]);
      setData({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetches = [];
    allProducts.forEach(product => {
      sortedShared.forEach(week => {
        fetches.push(
          fetch(`/data/${product}/${week}.json`)
            .then(res => (res.ok ? res.json() : null))
            .then(report => ({ product, week, report }))
            .catch(() => ({ product, week, report: null }))
        );
      });
    });

    Promise.all(fetches)
      .then(results => {
        const byProduct = {};
        allProducts.forEach(p => { byProduct[p] = {}; });
        results.forEach(({ product, week, report }) => {
          if (report) byProduct[product][week] = report;
        });
        setData(byProduct);
        setProducts(allProducts);
        setCommonWeeks(sortedShared);
        setError(null);
      })
      .catch(() => setError('Failed to load comparison data'))
      .finally(() => setLoading(false));
  }, [manifest]);

  return { data, products, commonWeeks, loading, error };
}
