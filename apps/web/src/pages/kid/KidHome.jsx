import { useNavigate } from 'react-router-dom';
import { useShows } from '../../hooks/useShows.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { useCharacters } from '../../hooks/useCharacters.js';
import { getPBFileUrl } from '../../lib/utils.js';

export default function KidHome() {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const { data: shows } = useShows(activeWorkspace?.id);
  const firstShow = shows?.[0];
  const { data: characters } = useCharacters(activeWorkspace?.id, firstShow?.id);
  const mainChar = characters?.find(c => c.role === 'main') || characters?.[0];
  const charImg = mainChar?.reference_image ? getPBFileUrl(mainChar, mainChar.reference_image, '400x400') : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-5xl font-black text-slate-900 mb-2">
        🌟 Welcome to{' '}
        <span className="text-brand-purple">{firstShow?.name || 'StudioAI'}!</span>
      </h1>
      <p className="text-xl text-slate-700 mb-10">Your favourite cartoon show!</p>

      {charImg && (
        <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl shadow-orange-300 mb-10 border-4 border-white">
          <img src={charImg} alt={mainChar?.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl">
        <button
          onClick={() => navigate('/kid/watch')}
          className="min-h-24 rounded-3xl font-black text-2xl bg-brand-purple text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          ▶ Watch!
        </button>
        <button
          onClick={() => navigate('/kid/characters')}
          className="min-h-24 rounded-3xl font-black text-2xl bg-brand-orange text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          👦 Characters!
        </button>
        <button
          onClick={() => navigate('/kid/watch')}
          className="min-h-24 rounded-3xl font-black text-2xl bg-green-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          ⭐ Latest!
        </button>
      </div>
    </div>
  );
}
