// src/clients/utils/http.ts

export interface HttpRequestOptions<TBody = unknown> {
  method: string;
  url: string;
  baseUrl?: string;
  body?: TBody;
  headers?: Record<string, string>;
  client?: Deno.HttpClient;
}

/**
 * Perform an HTTP request, serializing the `body` to JSON if provided.
 *
 * Note:
 * - We omit `body` from RequestInit so that our `body` field can be any TBody,
 *   and we handle stringifying it internally.
 * - Any other RequestInit fields (e.g., signal, mode, etc.) can still be passed.
 */
export async function httpRequest<
  TBody = unknown,
  TResponse = unknown,
>(
  {
    method,
    url,
    baseUrl = "http://localhost",
    body,
    headers = { "Content-Type": "application/json" },
    client,
    ...rest
  }: HttpRequestOptions<TBody> & Omit<RequestInit, "body">,
): Promise<TResponse> {
  const fullUrl = url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `${baseUrl}${url}`;

  const resp = await fetch(fullUrl, {
    method,
    headers,
    // Serialize the typed body to JSON if present; otherwise undefined
    body: body !== undefined ? JSON.stringify(body) : undefined,
    client,
    ...rest,
  });

  if (!resp.ok) {
    throw new Error(`HTTP API error: ${resp.status} ${resp.statusText}`);
  }

  const contentType = resp.headers.get("content-type") ?? "";
  if (
    contentType.includes("application/json") ||
    contentType.includes("application/vnd.lxd.api+json")
  ) {
    return await resp.json();
  }

  return await resp.text() as unknown as TResponse;
}
