import { Outlet } from 'react-router-dom';

export function KidLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-300 to-orange-300">
      <Outlet />
    </div>
  );
}

export default KidLayout;
