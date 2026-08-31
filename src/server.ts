import {
  NotificatorClient,
  type ClientOptions,
  type NotificationPayload,
  type NotificationResult,
  type RequestOptions,
} from "@notificator-project/api";

const DEFAULT_SOURCE = "astro";

/** Options used by the server-side Astro wrapper around the Notificator client. */
export interface AstroNotifierOptions extends ClientOptions {
  /** Default source attached when an individual notification does not provide one. */
  source?: string;
}

/** A Notificator client with an Astro-specific default source. */
export interface AstroNotifier {
  /** The underlying official API client, exposed for advanced server-side use. */
  readonly client: NotificatorClient;
  /** Send one notification through the hosted Notificator service. */
  notify(
    payload: NotificationPayload,
    options?: RequestOptions,
  ): Promise<NotificationResult>;
  /** Read public service metadata from the Notificator API. */
  getMetadata(options?: RequestOptions): Promise<Record<string, unknown>>;
}

/**
 * Create a server-only Notificator helper for Astro Actions, API routes, and
 * server-rendered pages.
 *
 * The API key defaults to `process.env.NOTIFICATOR_API_KEY`, as provided by the
 * official Node.js SDK. Never call this helper from a hydrated client script.
 */
export function createAstroNotifier(
  options: AstroNotifierOptions = {},
): AstroNotifier {
  assertServerRuntime();

  const { source = DEFAULT_SOURCE, ...clientOptions } = options;
  const client = new NotificatorClient(clientOptions);

  return {
    client,
    notify(payload, requestOptions) {
      return client.notify(
        {
          ...payload,
          source: payload.source ?? source,
        },
        requestOptions,
      );
    },
    getMetadata(requestOptions) {
      return client.getMetadata(requestOptions);
    },
  };
}

/**
 * Send a single server-side notification without retaining a client instance.
 */
export function sendNotification(
  payload: NotificationPayload,
  options?: AstroNotifierOptions,
  requestOptions?: RequestOptions,
): Promise<NotificationResult> {
  return createAstroNotifier(options).notify(payload, requestOptions);
}

function assertServerRuntime(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "@notificator-project/astro is server-only. Move this call to an Astro Action, API route, middleware, or server-rendered page.",
    );
  }
}

export type {
  ClientOptions,
  NotificationCategory,
  NotificationPayload,
  NotificationResult,
  NotificationSeverity,
  RequestOptions,
} from "@notificator-project/api";
export { NotificatorApiError } from "@notificator-project/api";
