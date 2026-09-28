export async function checkHealth(signal: AbortSignal): Promise<void> {
  const baseUrl = (
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  ).replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/health`, {
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Bağlantı kontrolü başarısız oldu.');
  const result: unknown = await response.json();
  if (
    typeof result !== 'object' ||
    result === null ||
    !('status' in result) ||
    result.status !== 'ok' ||
    !('database' in result) ||
    result.database !== 'connected'
  ) {
    throw new Error('Sunucudan beklenmeyen yanıt alındı.');
  }
}
