import useWorkspaceStore from '../stores/workspaceStore.js';
import { useWorkspaceUsage } from './useWorkspace.js';

const PLAN_LIMITS = {
  starter: { shows: 1, characters_per_show: 3, episodes_per_month: 4, team: 1 },
  pro: { shows: 3, characters_per_show: 10, episodes_per_month: -1, team: 5 },
  studio: { shows: -1, characters_per_show: -1, episodes_per_month: -1, team: -1 },
};

export function usePlan() {
  const { activeWorkspace } = useWorkspaceStore();
  const plan = activeWorkspace?.plan || 'starter';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  const { data: usage } = useWorkspaceUsage(activeWorkspace?.id);

  const isUnlimited = (limit) => limit === -1;

  const isAtShowLimit = () => {
    if (isUnlimited(limits.shows)) return false;
    return (usage?.shows_used || 0) >= limits.shows;
  };

  const isAtEpisodeLimit = () => {
    if (isUnlimited(limits.episodes_per_month)) return false;
    return (usage?.episodes_this_month || 0) >= limits.episodes_per_month;
  };

  const isAtTeamLimit = () => {
    if (isUnlimited(limits.team)) return false;
    return (usage?.team_used || 0) >= limits.team;
  };

  const showsRemaining = () => {
    if (isUnlimited(limits.shows)) return Infinity;
    return Math.max(0, limits.shows - (usage?.shows_used || 0));
  };

  const episodesRemaining = () => {
    if (isUnlimited(limits.episodes_per_month)) return Infinity;
    return Math.max(0, limits.episodes_per_month - (usage?.episodes_this_month || 0));
  };

  return {
    plan,
    limits,
    usage,
    isUnlimited,
    isAtShowLimit,
    isAtEpisodeLimit,
    isAtTeamLimit,
    showsRemaining,
    episodesRemaining,
    isPro: plan === 'pro' || plan === 'studio',
    isStudio: plan === 'studio',
    hasPriorityRendering: plan === 'studio',
    hasYouTubePublish: plan !== 'starter',
  };
}

export default usePlan;
