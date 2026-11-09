import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { config } from 'src/ui-config';
import { endSession, readSession } from './session-auth';

interface IUserContextType {
  credentials: Credentials | null;
  isLoading: boolean;
  authError: string;
  setCredentials: (
    username: string,
    password: string,
    remember?: boolean,
  ) => void;
  clearCredentials: () => Promise<void>;
  updateUsername: (username: string) => void;
  updatePassword: (password: string) => void;
}

interface Credentials {
  username: string;
  password: string;
  remember: boolean;
  authentication?: 'basic' | 'session';
}

const UserContext = createContext<IUserContextType>(undefined);
export const useUserContext = () => useContext(UserContext);

function cachedCredentials() {
  if (!window.sessionStorage.credentials && !window.localStorage.credentials) {
    return null;
  }

  try {
    const credentials = JSON.parse(
      window.sessionStorage.credentials || window.localStorage.credentials,
    );
    // A Django session is represented by its cookie, not by client-side
    // credentials. Always revalidate it after a page load.
    return credentials.authentication === 'session' ? null : credentials;
  } catch (_e) {
    return null;
  }
}

export const UserContextProvider = ({ children }: { children: ReactNode }) => {
  const external = Boolean(config.UI_EXTERNAL_LOGIN_URI);
  const [credentials, setCredentials] = useState<Credentials | null>(() =>
    external ? null : cachedCredentials(),
  );
  const [isLoading, setIsLoading] = useState(external);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!external) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    window.localStorage.removeItem('credentials');
    window.sessionStorage.removeItem('credentials');

    const restoreSession = async () => {
      // Use the structured session endpoint without requiring user-list permissions.
      const user = await readSession(config.API_BASE_PATH);
      if (!cancelled) {
        setCredentials(
          user
            ? {
                username: user.username,
                password: '',
                remember: false,
                authentication: 'session',
              }
            : null,
        );
      }
    };

    restoreSession()
      .catch(() => {
        if (!cancelled)
          setAuthError('Unable to check your sign-in. Please reload the page.');
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [external]);

  useEffect(() => {
    if (external || credentials?.authentication === 'session') {
      window.localStorage.removeItem('credentials');
      window.sessionStorage.removeItem('credentials');
    } else if (credentials) {
      window.sessionStorage.credentials = JSON.stringify(credentials);
    }
    if (
      !external &&
      credentials?.remember &&
      credentials.authentication !== 'session'
    ) {
      window.localStorage.credentials = JSON.stringify(credentials);
    }
    if (!credentials) {
      window.localStorage.removeItem('credentials');
      window.sessionStorage.removeItem('credentials');
    }
  }, [credentials, external]);

  const clearCredentials = async () => {
    if (!external) {
      setCredentials(null);
      return;
    }
    try {
      if (external) await endSession(config.API_BASE_PATH);
      window.localStorage.removeItem('credentials');
      window.sessionStorage.removeItem('credentials');
      setCredentials(null);
      setAuthError('');
      window.location.assign(config.UI_BASE_PATH);
    } catch {
      setAuthError(
        'Unable to sign out. Your session is still active; please try again.',
      );
    }
  };

  return (
    <UserContext.Provider
      value={{
        credentials,
        isLoading,
        authError,
        setCredentials: (username, password, remember = false) =>
          setCredentials({
            username,
            password,
            remember,
            authentication: 'basic',
          }),
        clearCredentials,
        updateUsername: (username) =>
          setCredentials((credentials) => ({ ...credentials, username })),
        updatePassword: (password) =>
          setCredentials((credentials) => ({ ...credentials, password })),
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
