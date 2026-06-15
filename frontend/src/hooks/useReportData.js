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
    if (!product || !week) return;

    setLoading(true);
    fetch(`/data/${product}/${week}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load report data');
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
