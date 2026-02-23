import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelative(date) {
  if (!date) return '-';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diff = (new Date(date) - Date.now()) / 1000;
  const absDiff = Math.abs(diff);
  if (absDiff < 60) return rtf.format(Math.round(diff), 'second');
  if (absDiff < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (absDiff < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

export function formatDuration(seconds) {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
  }).format(cents / 100);
}

export function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function getPBFileUrl(record, filename, thumb = '') {
  const baseUrl = import.meta.env.VITE_PB_URL || 'http://localhost:8090';
  if (!filename) return null;
  const url = `${baseUrl}/api/files/${record.collectionId || record.collectionName}/${record.id}/${filename}`;
  return thumb ? `${url}?thumb=${thumb}` : url;
}

export const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-700',
  SCRIPT_GENERATING: 'bg-blue-100 text-blue-700',
  SCRIPT_READY: 'bg-indigo-100 text-indigo-700',
  RENDER_QUEUED: 'bg-yellow-100 text-yellow-700',
  RENDERING: 'bg-orange-100 text-orange-700',
  RENDER_FAILED: 'bg-red-100 text-red-700',
  AWAITING_APPROVAL: 'bg-purple-100 text-purple-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  PUBLISHING: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-green-100 text-green-700',
};

export const STATUS_LABELS = {
  PENDING: 'Pending',
  SCRIPT_GENERATING: 'Generating Script',
  SCRIPT_READY: 'Script Ready',
  RENDER_QUEUED: 'Queued',
  RENDERING: 'Rendering',
  RENDER_FAILED: 'Render Failed',
  AWAITING_APPROVAL: 'Awaiting Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PUBLISHING: 'Publishing',
  PUBLISHED: 'Published',
};

