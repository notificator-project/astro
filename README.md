# Notificator for Astro

Send meaningful server-side Astro events to the Notificator inbox, mobile app, optional email, and connected MQTT devices.

This package wraps the official [`@notificator-project/api`](https://www.npmjs.com/package/@notificator-project/api) Node.js SDK and adds Astro-friendly defaults plus an optional successful-build integration.

> Preview package: the API may evolve before the first stable release.

## What it is for

Use Notificator from trusted Astro server code when something worth acting on happens, for example:

- a contact or newsletter form is submitted;
- an Astro Action completes an important workflow;
- an API route receives a webhook;
- a queue, scheduled task, or server-side integration needs attention;
- a production build completes successfully.

The package does not add browser-side tracking, analytics, or a visual widget.

## Requirements

- Node.js 20 or newer
- Astro 5 or newer
- A server-side `public_client` API key created in the [web dashboard (beta)](https://dashboard.notificator-project.com) or Notificator mobile app
- A server runtime, serverless function, Astro Action, or API route for runtime alerts

A fully static site has no runtime server process. It can still use the optional build notification, or send alerts from a deployment hook or serverless function.

## Install

```bash
npm install @notificator-project/astro
```

Add your key to the deployment environment or a local `.env` file that is not committed:

```dotenv
NOTIFICATOR_API_KEY=wpnotif_replace_with_your_public_client_key
```

## Send an alert from an Astro Action

```ts
// src/actions/index.ts
import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { createAstroNotifier } from "@notificator-project/astro/server";

const notificator = createAstroNotifier();

export const server = {
  contact: defineAction({
    accept: "form",
    input: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    handler: async ({ name, email }) => {
      await notificator.notify({
        title: "New contact request",
        body: `${name} submitted the contact form.`,
        severity: "info",
        data: { email },
      });

      return { success: true };
    },
  }),
};
```

## Send an alert from an API route

```ts
// src/pages/api/deploy.ts
import type { APIRoute } from "astro";
import { sendNotification } from "@notificator-project/astro/server";

export const POST: APIRoute = async ({ request }) => {
  const deployment = await request.json();

  await sendNotification({
    title: "Deployment complete",
    body: `${deployment.version} is live.`,
    severity: "info",
    data: { version: deployment.version },
  });

  return new Response(null, { status: 204 });
};
```

## Optional build notification

The default integration can send one alert after Astro finishes a successful production build. It is disabled unless you explicitly enable it.

```ts
// astro.config.mjs
import { defineConfig } from "astro/config";
import notificator from "@notificator-project/astro";

export default defineConfig({
  integrations: [
    notificator({
      notifyOnBuild: {
        title: "Website build complete",
        body: "The production website was generated successfully.",
        data: { environment: "production" },
      },
    }),
  ],
});
```

The integration reads `NOTIFICATOR_API_KEY` when the build-complete hook runs. Use `apiKeyEnv` to select a different uppercase environment-variable name.

Build alerts do not report failed builds because Astro cannot run the completed-build hook when compilation stops early. Configure failure alerts in your CI or hosting provider instead.

## Delivery controls

Every notification supports the same delivery controls as the official Node.js SDK:

```ts
await notificator.notify({
  title: "Order queue needs attention",
  body: "The queue exceeded its warning threshold.",
  severity: "warning",
  sendPush: true,
  sendEmail: true,
  sendMqtt: true,
  deviceId: "optional-target-device-id",
});
```

Email follows the account preference unless explicitly supplied. MQTT uses the connection configured by the user and can target all active devices or one owned device.

## Security

- Import this package only from trusted server-side code.
- Never prefix the API key with `PUBLIC_` or expose it through client-side environment variables.
- Never call the helper from a hydrated framework component or browser script.
- Revoke an exposed key in the web dashboard or Notificator mobile app and create a replacement.
- The package does not request Expo, Supabase, email-provider, or platform MQTT credentials.

## Development

```bash
npm install
npm run check
npm run pack:check
```

## Project links

- [Get started](https://notificator-project.com/get-started/)
- [Documentation](https://docs.notificator-project.com/)
- [Node.js SDK](https://github.com/notificator-project/Node-SDK)
- [Project changelog](https://notificator-project.com/changelog/)
- [Support](https://notificator-project.com/support/)

Notificator is free and open source. This package is released under the MIT License.
