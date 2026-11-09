import { afterEach, describe, expect, it, vi } from 'vitest';
import { endSession, readSession } from './session-auth';

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = 'csrftoken=; Max-Age=0; Path=/';
});

describe('external session authentication', () => {
  it('loads the current identity using the session cookie, without a Basic header', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ username: 'employee' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetch);
    expect(await readSession('/pulp/api/v3/')).toEqual({
      username: 'employee',
    });
    expect(fetch).toHaveBeenCalledWith('/pulp/api/v3/login/', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
  });
  it.each([401, 403])('treats status %s as signed out', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status })),
    );
    expect(await readSession('/pulp/api/v3/')).toBeNull();
  });
  it('does not treat an outage as a successful anonymous session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 502 })),
    );
    await expect(readSession('/pulp/api/v3/')).rejects.toThrow(
      'Session lookup failed',
    );
  });
  it('invalidates the server session with CSRF protection on logout', async () => {
    document.cookie = 'csrftoken=test-csrf; Path=/';
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    await endSession('/pulp/api/v3/');
    expect(fetch).toHaveBeenCalledWith('/pulp/api/v3/login/', {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': 'test-csrf',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
  });
  it('reports a failed logout rather than claiming the session was ended', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 403 })),
    );
    await expect(endSession('/pulp/api/v3/')).rejects.toThrow('Logout failed');
  });
});
