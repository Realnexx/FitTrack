/** Explicit app settings take precedence over integration-provisioned defaults. */
export function supabaseServerConfig(env: Record<string, string | undefined>) {
  return {
    url: env['FITTRACK_SUPABASE_URL'] || env['SUPABASE_URL'],
    publicKey: env['FITTRACK_SUPABASE_PUBLISHABLE_KEY'] || env['SUPABASE_PUBLISHABLE_KEY'],
    serviceKey: env['FITTRACK_SUPABASE_SERVICE_ROLE_KEY'] || env['SUPABASE_SERVICE_ROLE_KEY'],
  };
}
