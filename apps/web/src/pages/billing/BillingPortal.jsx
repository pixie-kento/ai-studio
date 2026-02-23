import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import toast from 'react-hot-toast';

export default function BillingPortal() {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    api.post('/api/billing/portal', {
      workspaceId: activeWorkspace.id,
      returnUrl: `${window.location.origin}/billing/plans`,
    })
      .then(({ data }) => {
        window.location.href = data.url;
      })
      .catch(() => {
        toast.error('Failed to open billing portal');
        navigate('/settings/billing');
      });
  }, [activeWorkspace?.id, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-500">
      <Loader2 size={36} className="animate-spin text-brand-purple" />
      <p className="text-lg font-medium">Opening billing portal…</p>
    </div>
  );
}
