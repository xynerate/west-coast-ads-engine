/** Minimal Deno globals for Supabase Edge Functions (IDE type-checking). */
declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  };

  function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: {
      port?: number;
      hostname?: string;
      signal?: AbortSignal;
      onListen?: (params: { hostname: string; port: number }) => void;
      onError?: (error: unknown) => Response | Promise<Response>;
    },
  ): Promise<void>;
}

