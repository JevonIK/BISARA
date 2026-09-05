export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (options.method && !['GET', 'HEAD'].includes(options.method)) {
    const csrf = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('bisara_csrf='));
    if (csrf)
      headers.set(
        'X-CSRF-Token',
        decodeURIComponent(csrf.slice('bisara_csrf='.length)),
      );
  }
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: options.signal ?? AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(
      0,
      'Server belum terhubung. Periksa koneksi lalu coba lagi.',
    );
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: 'Sesi berakhir atau email dan kata sandi tidak cocok.',
      403: 'Sesi perlu diperbarui. Silakan masuk kembali.',
      409: 'Data sudah berubah. Muat ulang sebelum melanjutkan.',
      422: 'Periksa isian dan format data yang dikirim.',
      429: 'Terlalu banyak percobaan. Coba lagi setelah satu menit.',
    };
    throw new ApiError(
      response.status,
      messages[response.status] ?? 'Server belum siap. Coba lagi sebentar.',
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
