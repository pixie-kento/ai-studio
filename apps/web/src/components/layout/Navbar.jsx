import { useState } from 'react';
import { Bell, Command, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatRelative, cn } from '../../lib/utils.js';
import { useNotifications, useMarkRead, useMarkAllRead } from '../../hooks/useNotifications.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import useUIStore from '../../stores/uiStore.js';
import { ThemeToggle } from '../shared/ThemeToggle.jsx';

export function Navbar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const { activeWorkspace } = useWorkspaceStore();
  const { toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  const { data: notifData } = useNotifications(activeWorkspace?.id);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead(activeWorkspace?.id);

  const notifications = notifData?.items || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotifClick = (notif) => {
    markRead.mutate(notif.id);
    if (notif.action_url) navigate(notif.action_url);
    setNotifOpen(false);
  };

  return (
    <header className="relative z-10 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/72 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45">
      <button
        type="button"
        onClick={toggleSidebar}
        className="rounded-xl border border-slate-300 bg-white/80 p-2 text-slate-500 transition-colors hover:text-slate-900 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="hidden min-w-0 flex-1 items-center md:flex">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('studioai:toggle-quick-actions'))}
          className="inline-flex w-full max-w-[420px] items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-left text-sm text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
        >
          <Command size={15} />
          <span className="flex-1">Quick actions, routes, and shortcuts</span>
          <span className="rounded border border-slate-300 px-1 text-[10px] dark:border-white/20">Ctrl+K</span>
        </button>
      </div>

      <div className="flex-1 md:hidden" />

      <ThemeToggle />

      <div className="relative">
        <button
          type="button"
          onClick={() => setNotifOpen((prev) => !prev)}
          className="relative rounded-xl border border-slate-300 bg-white/80 p-2 text-slate-500 transition-colors hover:text-slate-900 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-2 w-[min(22rem,88vw)] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_22px_45px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 dark:shadow-[0_24px_56px_-28px_rgba(2,6,23,1)]">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-white/10">
                <h3 className="font-semibold text-slate-900 dark:text-slate-50">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllRead.mutate()}
                      className="text-xs text-brand-purple hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  <button type="button" onClick={() => setNotifOpen(false)}>
                    <X size={14} className="text-slate-400 dark:text-slate-500" />
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotifClick(n)}
                      className={cn(
                        'w-full border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0',
                        'hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5',
                        !n.is_read && 'bg-brand-purple-light/45 dark:bg-brand-purple/12',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-purple" />}
                        <div className={cn(!n.is_read ? 'ml-0' : 'ml-4')}>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{n.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-300">{n.message}</p>
                          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatRelative(n.created)}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export default Navbar;
