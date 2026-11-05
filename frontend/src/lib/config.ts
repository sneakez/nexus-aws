/**
 * NexusOMS Feature Flags & Runtime Configuration
 */
export const DATA_MODE: 'mock' | 'supabase' = 
  import.meta.env.VITE_DATA_MODE === 'mock' ? 'mock' : 'supabase';

export function isMockMode(): boolean {
  return DATA_MODE === 'mock';
}
