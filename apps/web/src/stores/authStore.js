import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
  token: localStorage.getItem('auth_token') || null,
  workspaces: JSON.parse(localStorage.getItem('auth_workspaces') || '[]'),
  isAuthenticated: !!localStorage.getItem('auth_token'),

  setAuth: ({ user, token, workspaces = [] }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_workspaces', JSON.stringify(workspaces));
    set({ user, token, workspaces, isAuthenticated: true });
  },

  updateUser: (updates) => {
    const user = { ...get().user, ...updates };
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_workspaces');
    localStorage.removeItem('active_workspace');
    set({ user: null, token: null, workspaces: [], isAuthenticated: false });
  },

  isSuperAdmin: () => get().user?.platform_role === 'superadmin',
}));

export default useAuthStore;
