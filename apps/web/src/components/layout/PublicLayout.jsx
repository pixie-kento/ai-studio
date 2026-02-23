import { Outlet } from 'react-router-dom';
import { ThemeToggle } from '../shared/ThemeToggle.jsx';

export function PublicLayout() {
  return (
    <div className="public-shell-bg relative min-h-screen">
      <div className="fixed right-4 top-4 z-[60]">
        <ThemeToggle />
      </div>
      <Outlet />
    </div>
  );
}

export default PublicLayout;
