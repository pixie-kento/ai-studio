import { useNavigate } from 'react-router-dom';
import { CheckCircle, Tv, Users, Film } from 'lucide-react';
import api from '../../lib/api.js';
import useAuthStore from '../../stores/authStore.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { useShows } from '../../hooks/useShows.js';

export default function SetupComplete() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const { data: shows } = useShows(activeWorkspace?.id);
  const firstShow = shows?.[0];

  const handleGoToDashboard = async () => {
    try {
      await api.patch('/api/auth/me', { onboarding_completed: true });
      updateUser({ onboarding_completed: true });
    } catch {}
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex gap-1 justify-center mb-6">
            {[1,2,3,4].map(s => (
              <div key={s} className="h-1 w-12 rounded-full bg-brand-purple" />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-slate-900 mb-2">🎉 Your Studio is Ready!</h1>
          <p className="text-slate-500 mb-8">Here's what we've set up for you:</p>

          {firstShow && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-purple-light rounded-lg flex items-center justify-center">
                  <Tv size={20} className="text-brand-purple" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Your Show</p>
                  <p className="font-semibold text-slate-900">{firstShow.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Users size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Characters</p>
                  <p className="font-semibold text-slate-900">1 character created</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Film size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Episodes</p>
                  <p className="font-semibold text-slate-900">Ready to generate your first episode!</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleGoToDashboard}
            className="btn-primary w-full py-3 text-base justify-center"
          >
            Go to Dashboard 🎬
          </button>
        </div>
      </div>
    </div>
  );
}
