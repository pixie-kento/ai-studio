import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import useAuthStore from '../stores/authStore.js';
import useWorkspaceStore from '../stores/workspaceStore.js';

export function useLogin() {
  const { setAuth } = useAuthStore();
  const { setWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (credentials) => api.post('/api/auth/login', credentials).then(r => r.data),
    onSuccess: (data) => {
      setAuth({ user: data.user, token: data.token, workspaces: data.workspaces });
      if (data.workspaces?.length > 0) {
        setWorkspace(data.workspaces[0]);
      }
      if (!data.user.onboarding_completed) {
        navigate('/onboarding/welcome');
      } else {
        navigate('/dashboard');
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Login failed');
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const { setWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data) => api.post('/api/auth/register', data).then(r => r.data),
    onSuccess: (data) => {
      setAuth({ user: data.user, token: data.token, workspaces: [data.workspace] });
      setWorkspace(data.workspace);
      navigate('/onboarding/welcome');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Registration failed');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const { clearWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  return () => {
    logout();
    clearWorkspace();
    navigate('/login');
    toast.success('Logged out');
  };
}

export default { useLogin, useRegister, useLogout };
