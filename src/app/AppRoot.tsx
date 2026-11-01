import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './router/AppRouter';

export function AppRoot() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
