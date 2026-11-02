import { useCallback, useEffect, useState } from 'react';

export type AppPath = '/' | '/login' | '/app' | `/app/${string}`;

export function useAppRouter() {
  const [path, setPath] = useState(() => window.location.pathname || '/');

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPath: AppPath, replace = false) => {
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { path, navigate, isWorkspace: path.startsWith('/app') };
}
