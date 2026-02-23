import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Navbar } from './Navbar.jsx';
import { UpgradeModal } from '../shared/UpgradePrompt.jsx';
import { FloatingActions } from '../shared/FloatingActions.jsx';
import useUIStore from '../../stores/uiStore.js';
import { cn } from '../../lib/utils.js';

export function AppShell() {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="app-shell-bg relative flex h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-80" />

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-30 w-72 transition-transform duration-200 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <Sidebar className="h-full" />
      </div>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/45 backdrop-blur-[2px] lg:hidden"
          onClick={() => useUIStore.getState().setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global modals */}
      <UpgradeModal />
      <FloatingActions />
    </div>
  );
}

export default AppShell;
