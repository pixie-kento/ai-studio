import { useParams, Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { CharacterCard } from '../../components/shared/CharacterCard.jsx';
import { UpgradePromptInline } from '../../components/shared/UpgradePrompt.jsx';
import { useCharacters } from '../../hooks/useCharacters.js';
import { usePlan } from '../../hooks/usePlan.js';
import { useShow } from '../../hooks/useShows.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';

export default function CharacterList() {
  const { showId } = useParams();
  const { activeWorkspace } = useWorkspaceStore();
  const { data: show } = useShow(activeWorkspace?.id, showId);
  const { data: characters, isLoading } = useCharacters(activeWorkspace?.id, showId);
  const { limits } = usePlan();

  const characterItems = Array.isArray(characters) ? characters : [];
  const maxCharacters = limits.characters_per_show === -1 ? Infinity : limits.characters_per_show;
  const atLimit = characterItems.length >= maxCharacters;

  return (
    <div className="space-y-6">
      <section className="card border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-400">
              <Link to="/shows" className="transition-colors hover:text-brand-purple">Shows</Link>{' '}
              /{' '}
              <Link to={`/shows/${showId}`} className="transition-colors hover:text-brand-purple">
                {show?.name || 'Show'}
              </Link>{' '}
              / Characters
            </p>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">Characters</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Manage voices, references, and character traits for this show.
            </p>
          </div>

          {!atLimit ? (
            <Link to={`/shows/${showId}/characters/new`} className="btn-primary w-full justify-center py-2.5 sm:w-auto">
              <Plus size={16} />
              Add character
            </Link>
          ) : null}
        </div>

        <div className="mt-3 inline-flex items-center rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {characterItems.length}
          {maxCharacters === Infinity ? ' / unlimited' : ` / ${maxCharacters}`} characters
        </div>
      </section>

      {atLimit ? (
        <UpgradePromptInline
          message={`You've reached this plan's character limit (${limits.characters_per_show} per show). Upgrade to add more.`}
        />
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <div key={item} className="card aspect-square animate-pulse bg-slate-100 dark:bg-white/5" />
          ))}
        </div>
      ) : characterItems.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
            <Users size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">No characters yet</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Add your main cast so scripts and scenes can stay consistent.
          </p>
          <Link to={`/shows/${showId}/characters/new`} className="btn-primary mt-6">
            Add first character
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {characterItems.map((character) => (
            <CharacterCard key={character.id} character={character} showId={showId} />
          ))}
        </div>
      )}
    </div>
  );
}
