import type { AstroIntegration } from "astro";

import { createAstroNotifier } from "./server.js";
import type { NotificationPayload } from "./server.js";

const DEFAULT_API_KEY_ENV = "NOTIFICATOR_API_KEY";
const DEFAULT_SOURCE = "astro";
const ENVIRONMENT_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;

/** Configuration for the optional Astro lifecycle integration. */
export interface NotificatorIntegrationOptions {
  /** Disable every integration hook without removing it from Astro config. */
  enabled?: boolean;
  /** Name of the server environment variable containing a `public_client` key. */
  apiKeyEnv?: string;
  /** Default source used for build notifications. */
  source?: string;
  /** Request timeout passed to the official Notificator Node.js SDK. */
  timeoutMs?: number;
  /** Send an alert after a successful production build. Disabled by default. */
  notifyOnBuild?: boolean | NotificationPayload;
  /** Fail the Astro build when the optional build notification cannot be sent. */
  failBuildOnNotificationError?: boolean;
}

/**
 * Add optional Notificator lifecycle behaviour to an Astro project.
 *
 * Runtime alerts do not require this integration. Import `createAstroNotifier`
 * from `@notificator-project/astro/server` inside trusted server-side code.
 */
export default function notificator(
  options: NotificatorIntegrationOptions = {},
): AstroIntegration {
  const {
    enabled = true,
    apiKeyEnv = DEFAULT_API_KEY_ENV,
    source = DEFAULT_SOURCE,
    timeoutMs,
    notifyOnBuild = false,
    failBuildOnNotificationError = false,
  } = options;

  assertEnvironmentName(apiKeyEnv);

  return {
    name: "@notificator-project/astro",
    hooks: {
      "astro:config:setup": ({ logger }) => {
        if (!enabled) {
          logger.debug("Notificator integration is disabled.");
        }
      },
      "astro:build:done": async ({ pages, logger }) => {
        if (!enabled || !notifyOnBuild) return;

        const apiKey = process.env[apiKeyEnv];
        if (!apiKey) {
          const message = `Build notification skipped because ${apiKeyEnv} is not configured.`;
          if (failBuildOnNotificationError) throw new Error(message);
          logger.warn(message);
          return;
        }

        const customPayload = notifyOnBuild === true ? {} : notifyOnBuild;
        const routeCount = pages.length;
        const defaultBody = `Astro generated ${routeCount} route${routeCount === 1 ? "" : "s"}.`;

        try {
          const client = createAstroNotifier({
            apiKey,
            source: `${source}:build`,
            ...(timeoutMs === undefined ? {} : { timeoutMs }),
          });

          await client.notify({
            title: "Astro build complete",
            body: defaultBody,
            category: "info",
            severity: "info",
            ...customPayload,
            data: {
              routesGenerated: routeCount,
              ...customPayload.data,
            },
          });

          logger.info("Successful build notification sent.");
        } catch (error) {
          if (failBuildOnNotificationError) throw error;
          logger.warn(
            `Build completed, but its Notificator alert could not be sent: ${formatError(error)}`,
          );
        }
      },
    },
  };
}

function assertEnvironmentName(value: string): void {
  if (!ENVIRONMENT_NAME_PATTERN.test(value)) {
    throw new TypeError(
      "apiKeyEnv must be a valid uppercase environment variable name",
    );
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export {
  createAstroNotifier,
  NotificatorApiError,
  sendNotification,
} from "./server.js";
export type {
  AstroNotifier,
  AstroNotifierOptions,
  ClientOptions,
  NotificationCategory,
  NotificationPayload,
  NotificationResult,
  NotificationSeverity,
  RequestOptions,
} from "./server.js";
