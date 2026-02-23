import { Link } from 'react-router-dom';
import { ArrowUpRight, User } from 'lucide-react';
import { cn, getPBFileUrl } from '../../lib/utils.js';

const ROLE_STYLE = {
  main: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  supporting: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  recurring: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  background: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
};

export function CharacterCard({ character, showId, className }) {
  const avatarUrl = character.reference_image
    ? getPBFileUrl(character, character.reference_image, '300x300')
    : null;
  const traits = Array.isArray(character.personality_traits) ? character.personality_traits : [];

  return (
    <Link
      to={`/shows/${showId}/characters/${character.id}`}
      data-interactive="true"
      className={cn('card group overflow-hidden p-0', className)}
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-900">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={character.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
            <User size={52} />
          </div>
        )}

        <span
          className={cn(
            'absolute left-2 top-2 rounded-full px-2 py-1 text-[11px] font-semibold capitalize backdrop-blur-md',
            ROLE_STYLE[character.role] || ROLE_STYLE.background,
          )}
        >
          {character.role || 'character'}
        </span>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-900">
            Edit character
            <ArrowUpRight size={12} />
          </span>
        </div>
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 text-base font-bold text-slate-900 transition-colors group-hover:text-brand-purple dark:text-slate-100">
          {character.name}
        </h3>

        <div className="text-xs text-slate-400 dark:text-slate-400">
          {character.age ? `Age ${character.age}` : 'Age not set'}
        </div>

        {traits.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {traits.slice(0, 3).map((trait) => (
              <span
                key={trait}
                className="rounded-full border border-slate-200/80 bg-slate-50/80 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              >
                {trait}
              </span>
            ))}
            {traits.length > 3 ? (
              <span className="rounded-full border border-slate-200/80 bg-slate-50/80 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                +{traits.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export default CharacterCard;
