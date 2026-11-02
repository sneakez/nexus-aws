/**
 * NexusOMS Feature Flags & Runtime Configuration
 */
export const DATA_MODE: 'mock' | 'supabase' = 
  (import.meta.env.VITE_DATA_MODE as 'mock' | 'supabase') || 'mock';

export function isMockMode(): boolean {
  return DATA_MODE === 'mock';
}
