import { create } from 'zustand';

const THEME_STORAGE_KEY = 'studioai-theme';

function normalizeTheme(theme) {
  return theme === 'light' ? 'light' : 'dark';
}

function readStoredTheme() {
  if (typeof window === 'undefined') return 'dark';
  return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const normalized = normalizeTheme(theme);
  document.documentElement.classList.toggle('dark', normalized === 'dark');
  document.documentElement.setAttribute('data-theme', normalized);
  document.documentElement.style.colorScheme = normalized;
}

const useUIStore = create((set) => ({
  sidebarOpen: true,
  upgradeModalOpen: false,
  upgradeReason: null,
  theme: readStoredTheme(),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  openUpgradeModal: (reason = null) => set({ upgradeModalOpen: true, upgradeReason: reason }),
  closeUpgradeModal: () => set({ upgradeModalOpen: false, upgradeReason: null }),

  initTheme: () => {
    const theme = readStoredTheme();
    applyTheme(theme);
    set({ theme });
  },
  setTheme: (theme) => {
    const normalized = normalizeTheme(theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
    }
    applyTheme(normalized);
    set({ theme: normalized });
  },
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    }
    applyTheme(next);
    return { theme: next };
  }),
}));

export default useUIStore;
