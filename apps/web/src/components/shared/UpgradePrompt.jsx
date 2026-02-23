import { useNavigate } from 'react-router-dom';
import { Zap, X } from 'lucide-react';
import useUIStore from '../../stores/uiStore.js';

export function UpgradeModal() {
  const { upgradeModalOpen, upgradeReason, closeUpgradeModal } = useUIStore();
  const navigate = useNavigate();

  if (!upgradeModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_24px_56px_-28px_rgba(15,23,42,0.6)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_26px_62px_-28px_rgba(2,6,23,1)]">
        <button
          onClick={closeUpgradeModal}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-brand-purple-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap size={32} className="text-brand-purple" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-100">Upgrade Your Plan</h2>
          <p className="text-slate-600 dark:text-slate-300">
            {upgradeReason || "You've reached your plan limit. Upgrade to unlock more features."}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => { closeUpgradeModal(); navigate('/billing/plans'); }}
            className="btn-primary w-full py-3 text-base"
          >
            <Zap size={18} />
            View Upgrade Options
          </button>
          <button onClick={closeUpgradeModal} className="btn-secondary w-full py-3 text-base">
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

export function UpgradePromptInline({ message, ctaText = 'Upgrade Plan' }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border-2 border-dashed border-brand-purple/40 bg-brand-purple-light/40 p-6 text-center dark:border-brand-purple/30 dark:bg-brand-purple/10">
      <Zap size={24} className="text-brand-purple mx-auto mb-3" />
      <p className="mb-4 text-sm text-slate-700 dark:text-slate-300">{message}</p>
      <button
        onClick={() => navigate('/billing/plans')}
        className="btn-primary text-sm py-2 px-4"
      >
        {ctaText}
      </button>
    </div>
  );
}

export default UpgradeModal;
