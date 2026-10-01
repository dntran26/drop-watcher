const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

export class HttpError extends Error {
  constructor(public url: string, public status: number) {
    super(`HTTP ${status} from ${new URL(url).host}`);
  }
}

const HTML_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

async function fetchText(url: string, accept: string, timeoutMs: number): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "en-CA,en;q=0.9" },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
  });
  if (!res.ok) throw new HttpError(url, res.status);
  return res.text();
}

/**
 * Some retailers (Dyson's Akamai setup) reject Node's TLS fingerprint with a 403 but accept curl.
 * On a block, retry once through curl when it exists (GitHub Actions, local); otherwise rethrow.
 */
async function curlText(url: string, accept: string, timeoutMs: number): Promise<string> {
  const { execFile } = await import("node:child_process");
  return new Promise((resolve, reject) => {
    execFile(
      "curl",
      ["-sSL", "--compressed", "--max-time", String(Math.ceil(timeoutMs / 1000)), "-A", UA, "-H", `Accept: ${accept}`,
        "-H", "Accept-Language: en-CA,en;q=0.9", "-w", "\n%{http_code}", url],
      { maxBuffer: 20 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(err);
        const cut = stdout.lastIndexOf("\n");
        const status = Number(stdout.slice(cut + 1));
        if (status >= 400) return reject(new HttpError(url, status));
        resolve(stdout.slice(0, cut));
      },
    );
  });
}

async function getBody(url: string, accept: string, timeoutMs = 20000): Promise<string> {
  try {
    return await fetchText(url, accept, timeoutMs);
  } catch (e) {
    if (!(e instanceof HttpError) || ![403, 412, 429].includes(e.status)) throw e;
    try {
      return await curlText(url, accept, timeoutMs);
    } catch (curlErr) {
      // No curl on this host (e.g. Vercel): report the original block.
      if (curlErr instanceof HttpError) throw curlErr;
      throw e;
    }
  }
}

export async function getJson<T>(url: string): Promise<T> {
  return JSON.parse(await getBody(url, "application/json")) as T;
}

export async function getText(url: string): Promise<string> {
  return getBody(url, HTML_ACCEPT);
}

export function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}
