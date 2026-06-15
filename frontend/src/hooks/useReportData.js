import { useState, useEffect } from 'react';

export function useReportData(product, week) {
  const [manifest, setManifest] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch manifest
  useEffect(() => {
    fetch('/data/manifest.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load manifest');
        return res.json();
      })
      .then((data) => {
        setManifest(data);
      })
      .catch((err) => {
        console.error('Manifest fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // 2. Fetch specific report
  useEffect(() => {
    if (!product || !week || !manifest) return;

    // Validate that the requested week actually exists for this product
    const validWeeks = manifest.products?.[product]?.weeks || [];
    if (!validWeeks.includes(week)) {
      return; // Wait for App.jsx to correct the week state
    }

    setLoading(true);
    fetch(`/data/${product}/${week}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load report data');
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(`Data for ${product} (${week}) is not available yet.`);
        }
        return res.json();
      })
      .then((data) => {
        setReport(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Report fetch error:', err);
        setReport(null);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [product, week]);

  return { manifest, report, loading, error };
}
