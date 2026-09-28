export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const base = (
    import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  ).replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(
      0,
      'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.',
    );
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: unknown;
      fieldErrors?: Record<string, string[]>;
    } | null;
    throw new ApiError(
      response.status,
      typeof body?.message === 'string'
        ? body.message
        : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
      body?.fieldErrors,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
