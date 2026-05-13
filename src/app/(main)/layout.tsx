import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="page">
        <div className="page-content animate-fade-in">
          {children}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
