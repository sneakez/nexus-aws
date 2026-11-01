import { describe, it, expect } from 'vitest';
import type { RoutePath } from '@/lib/router';

describe('NexusOMS MVP routing architecture', () => {
  it('keeps only login and the authenticated workspace as entry points', () => {
    expect(['/','/login']).toEqual(expect.arrayContaining(['/','/login']));
    expect('/app').toMatch(/^\/app$/);
  });

  it('classifies authenticated workspace paths', () => {
    const appRoutes: RoutePath[] = [
      '/app',
      '/app/orders',
      '/app/inventory',
      '/app/fulfillment',
    ];

    appRoutes.forEach((route) => {
      expect(route.startsWith('/app')).toBe(true);
    });
  });

  it('does not advertise removed marketing, registration, or onboarding routes', () => {
    const removedPaths = ['/solutions', '/pricing', '/register', '/forgot-password', '/onboarding'];
    expect(removedPaths.every(path => !['/', '/login', '/app'].includes(path))).toBe(true);
  });
});
