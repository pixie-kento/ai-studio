import { create } from 'zustand';

const useWorkspaceStore = create((set, get) => ({
  activeWorkspace: JSON.parse(localStorage.getItem('active_workspace') || 'null'),
  activeShow: null,

  setWorkspace: (workspace) => {
    localStorage.setItem('active_workspace', JSON.stringify(workspace));
    set({ activeWorkspace: workspace, activeShow: null });
  },

  setActiveShow: (show) => set({ activeShow: show }),

  clearWorkspace: () => {
    localStorage.removeItem('active_workspace');
    set({ activeWorkspace: null, activeShow: null });
  },
}));

export default useWorkspaceStore;
