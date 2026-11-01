// Compatibility exports for legacy tests and modules. Runtime routing lives in src/app/router.
export { useAppRouter as useRouter } from '@/app/router/useAppRouter';
export type { AppPath as AppRoute } from '@/app/router/useAppRouter';

export type PublicRoute = '/' | '/login';
export type RoutePath = PublicRoute | '/app' | `/app/${string}` | string;
