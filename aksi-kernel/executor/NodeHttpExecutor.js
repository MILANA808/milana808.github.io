/**
 * AKSI real Node executor — deliberately narrow.
 * Supports GET only; redirects are rejected to prevent domain-boundary bypass.
 */
export function createNodeHttpExecutor({ mandate, timeoutMs = 15000, maxBytes = 65536 } = {}) {
  if (!mandate) throw new Error('createNodeHttpExecutor requires mandate');

  return async function execute(call) {
    const tool = String(call?.tool || '');
    if (tool !== 'http.get') throw new Error(`unsupported_real_tool:${tool}`);

    const params = call?.params || {};
    const rawUrl = call?.url || params.url;
    if (!rawUrl) throw new Error('http.get requires url');

    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('http.get requires http/https');
    }

    const domain = mandate.checkDomain(url.href);
    if (!domain.ok) throw new Error(domain.reason);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'error',
        signal: controller.signal,
        headers: { 'user-agent': 'AKSI-Control-Plane/1.0' },
      });
      const reader = response.body?.getReader?.();
      let bytes = 0;
      let text = '';

      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > maxBytes) {
            await reader.cancel();
            throw new Error('response_too_large');
          }
          text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
      } else {
        text = await response.text();
        bytes = Buffer.byteLength(text);
        if (bytes > maxBytes) throw new Error('response_too_large');
      }

      return {
        status: response.status,
        ok: response.ok,
        url: url.href,
        bytes,
        content_type: response.headers.get('content-type'),
        text,
      };
    } finally {
      clearTimeout(timer);
    }
  };
}

export default createNodeHttpExecutor;
