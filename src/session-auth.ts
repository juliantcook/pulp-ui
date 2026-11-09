import Cookies from 'js-cookie';

// Read the existing Django session; never copy session cookies into UI storage.
export async function readSession(
  apiBase: string,
): Promise<{ username: string } | null> {
  const response = await fetch(`${apiBase}login/`, {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error('Session lookup failed');
  const user = await response.json();
  if (typeof user.username !== 'string' || !user.username)
    throw new Error('Invalid session response');
  return { username: user.username };
}

export async function endSession(apiBase: string): Promise<void> {
  const response = await fetch(`${apiBase}login/`, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: {
      'X-CSRFToken': Cookies.get('csrftoken') || '',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!response.ok && response.status !== 401) throw new Error('Logout failed');
}
