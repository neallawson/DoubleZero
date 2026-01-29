import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { CrudMenuModal } from '@/components/crud/CrudMenuModal';

export function AppLayout() {
  const [isCrudMenuOpen, setIsCrudMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onOpenCrudMenu={() => setIsCrudMenuOpen(true)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <CrudMenuModal open={isCrudMenuOpen} onOpenChange={setIsCrudMenuOpen} />
    </div>
  );
}
