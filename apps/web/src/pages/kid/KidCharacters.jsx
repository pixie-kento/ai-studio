import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useShows } from '../../hooks/useShows.js';
import { useCharacters } from '../../hooks/useCharacters.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { getPBFileUrl } from '../../lib/utils.js';

const BG_COLORS = ['bg-purple-400', 'bg-orange-400', 'bg-green-400', 'bg-blue-400', 'bg-pink-400', 'bg-yellow-400'];

export default function KidCharacters() {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const { data: shows } = useShows(activeWorkspace?.id);
  const firstShow = shows?.[0];
  const { data: characters } = useCharacters(activeWorkspace?.id, firstShow?.id);
  const [idx, setIdx] = useState(0);

  const chars = (characters || []).filter(c => c.is_active !== false);
  const char = chars[idx];
  const imgUrl = char?.reference_image ? getPBFileUrl(char, char.reference_image, '400x400') : null;
  const traits = char?.personality_traits || [];
  const facts = [
    char?.age ? `I'm ${char.age}` : null,
    char?.speech_style || null,
    ...(char?.catchphrases || []).slice(0, 1),
    ...(traits.slice(0, 2).map(t => t)),
  ].filter(Boolean).slice(0, 3);

  if (!char) return (
    <div className="min-h-screen flex items-center justify-center text-3xl font-black text-slate-700">
      No characters yet! 🐾
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-500 ${BG_COLORS[idx % BG_COLORS.length]}`}>
      <button onClick={() => navigate('/kid')} className="absolute top-4 left-4 text-white font-black text-xl">← Back</button>

      <div className="w-64 h-64 rounded-full overflow-hidden border-8 border-white shadow-2xl mb-6">
        {imgUrl
          ? <img src={imgUrl} alt={char.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-white/30 flex items-center justify-center text-8xl">🎭</div>
        }
      </div>

      <h1 className="text-5xl font-black text-white mb-4 drop-shadow">{char.name}</h1>

      {facts.length > 0 && (
        <div className="space-y-2 mb-8 text-center max-w-sm">
          {facts.map((f, i) => (
            <p key={i} className="text-xl font-bold text-white/90 bg-black/20 rounded-full px-6 py-2">{f}</p>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => setIdx(i => (i - 1 + chars.length) % chars.length)}
          className="w-16 h-16 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <ChevronLeft size={32} />
        </button>
        <div className="flex gap-2">
          {chars.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`w-3 h-3 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-white/50'}`}
            />
          ))}
        </div>
        <button
          onClick={() => setIdx(i => (i + 1) % chars.length)}
          className="w-16 h-16 bg-white/30 hover:bg-white/50 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </div>
  );
}
