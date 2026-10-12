export const LANG_LABELS = {
  python: 'Python',
  java: 'Java',
  go: 'Go',
  javascript: 'JavaScript',
};

export const DIFF_LABELS = { 简单: 'easy', 中等: 'mid', 困难: 'hard' };

export async function api(path, opts) {
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok && data && data.error) {
    throw new Error(data.error);
  }
  return data;
}

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fmtLastTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (e) {
    return '';
  }
}

export function fmtFullTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch (e) {
    return '';
  }
}