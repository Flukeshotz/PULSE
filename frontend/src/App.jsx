import { useState, useEffect } from 'react';
import { useReportData } from './hooks/useReportData';
import { TopBar } from './components/layout/TopBar';
import { TabNav } from './components/layout/TabNav';
import { PageContainer } from './components/layout/PageContainer';
import { Overview } from './components/views/Overview';
import { Themes } from './components/views/Themes';
import { Trends } from './components/views/Trends';
import { Report } from './components/views/Report';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');

  const { manifest, report, loading, error } = useReportData(selectedProduct, selectedWeek);

  // Initialize selections once manifest loads
  useEffect(() => {
    if (manifest && !selectedProduct) {
      const defaultProduct = Object.keys(manifest.products)[0];
      if (defaultProduct) {
        setSelectedProduct(defaultProduct);
        const defaultWeek = manifest.products[defaultProduct].weeks[0];
        setSelectedWeek(defaultWeek || '');
      }
    }
  }, [manifest, selectedProduct]);

  // Update week if product changes and current week isn't available
  useEffect(() => {
    if (manifest && selectedProduct) {
      const weeks = manifest.products[selectedProduct].weeks;
      if (weeks && weeks.length > 0 && !weeks.includes(selectedWeek)) {
        setSelectedWeek(weeks[0]);
      }
    }
  }, [selectedProduct, manifest, selectedWeek]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased overflow-x-hidden w-full">
      <TopBar 
        manifest={manifest}
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        selectedWeek={selectedWeek}
        setSelectedWeek={setSelectedWeek}
      />
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <PageContainer>
        {error ? (
          <div className="p-6 bg-[var(--negative-soft)] text-[var(--negative)] rounded-md">
            Error loading data: {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--text-secondary)]">
            Loading...
          </div>
        ) : !report ? (
          <div className="flex items-center justify-center py-20 text-[var(--text-secondary)]">
            No report selected
          </div>
        ) : (
          <div className="w-full">
            {activeTab === 'overview' && <Overview report={report} setActiveTab={setActiveTab} />}
            {activeTab === 'themes' && <Themes report={report} />}
            {activeTab === 'trends' && <Trends manifest={manifest} selectedProduct={selectedProduct} />}
            {activeTab === 'report' && <Report report={report} />}
          </div>
        )}
      </PageContainer>
    </div>
  );
}

export default App;
