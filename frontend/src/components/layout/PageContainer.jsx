export function PageContainer({ children }) {
  return (
    <main className="max-w-[1200px] mx-auto px-6 py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {children}
    </main>
  );
}
