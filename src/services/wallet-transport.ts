export class WalletConfigurationError extends Error {
  constructor(message = 'Wallet service is not configured.') { super(message); this.name = 'WalletConfigurationError'; }
}
export function validateWalletEndpoint(endpoint: string, base: string, path: string): URL {
  const url = new URL(endpoint), project = new URL(base);
  if (project.protocol !== 'https:' || url.origin !== project.origin || url.username || url.password || url.search || url.hash ||
      url.pathname !== '/functions/v1/wallet-api/api/wallet/' + path) {
    throw new WalletConfigurationError('Wallet endpoint must belong to the configured Supabase project.');
  }
  return url;
}
export async function authenticatedJson(url: URL, token: string, key: string, signal?: AbortSignal): Promise<unknown> {
  if (!token) throw new Error('Sign in to load your wallet.');
  const response = await fetch(url, {
    method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token, apikey: key }, signal,
  });
  if (!response.ok) throw new Error('Wallet request failed with status ' + response.status + '.');
  return response.json();
}
