import { expect, it } from 'vitest';
import { supabaseServerConfig } from './server-config';

it('keeps all server clients on the explicitly configured app project', () => {
  expect(supabaseServerConfig({
    SUPABASE_URL: 'https://old.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'old-public',
    SUPABASE_SERVICE_ROLE_KEY: 'old-service',
    FITTRACK_SUPABASE_URL: 'https://fit.supabase.co',
    FITTRACK_SUPABASE_PUBLISHABLE_KEY: 'fit-public',
    FITTRACK_SUPABASE_SERVICE_ROLE_KEY: 'fit-service',
  })).toEqual({ url: 'https://fit.supabase.co', publicKey: 'fit-public', serviceKey: 'fit-service' });
});

it('preserves existing local configuration when no app override is set', () => {
  expect(supabaseServerConfig({ SUPABASE_URL: 'https://local.test', SUPABASE_PUBLISHABLE_KEY: 'public' }))
    .toEqual({ url: 'https://local.test', publicKey: 'public', serviceKey: undefined });
});
