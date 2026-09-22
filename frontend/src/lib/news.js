import { apiFetch } from './api';

export async function newsRequest(path = '', init = {}) {
  const response = await apiFetch(`/api/news${path}`, { cache: 'no-store', ...init });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load Club Events.');
  return result;
}

export async function uploadNewsImage(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) {
    throw new Error('Choose a JPEG, PNG, or WebP image under 6 MB.');
  }
  return newsRequest('/admin/media', {
    method: 'POST', headers: { 'Content-Type': file.type }, body: file,
  });
}

export function formatNewsDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
