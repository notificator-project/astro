import assert from "node:assert/strict";
import test from "node:test";

import notificator, {
  createAstroNotifier,
  NotificatorApiError,
  sendNotification,
} from "../dist/index.js";

test("adds the Astro source to server-side notifications", async () => {
  let request;
  const client = createAstroNotifier({
    apiKey: "wpnotif_test",
    fetch: async (url, options) => {
      request = { url, options };
      return new Response(
        JSON.stringify({ ok: true, kind: "external_notification" }),
      );
    },
  });

  await client.notify({ title: "Contact form submitted" });

  assert.equal(request.url, "https://api.notificator-project.com");
  assert.deepEqual(JSON.parse(request.options.body), {
    title: "Contact form submitted",
    source: "astro",
  });
});

test("preserves an explicit notification source", async () => {
  let body;
  await sendNotification(
    { title: "Order received", source: "shop-action" },
    {
      apiKey: "wpnotif_test",
      fetch: async (_url, options) => {
        body = JSON.parse(options.body);
        return new Response(
          JSON.stringify({ ok: true, kind: "external_notification" }),
        );
      },
    },
  );

  assert.equal(body.source, "shop-action");
});

test("rejects invalid environment variable names", () => {
  assert.throws(() => notificator({ apiKeyEnv: "not-valid" }), TypeError);
});

test("exposes structured API errors to Astro consumers", () => {
  assert.equal(typeof NotificatorApiError, "function");
});

test("sends an optional successful-build notification", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.NOTIFICATOR_BUILD_KEY;
  let body;

  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return new Response(
      JSON.stringify({ ok: true, kind: "external_notification" }),
    );
  };
  process.env.NOTIFICATOR_BUILD_KEY = "wpnotif_build";

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.NOTIFICATOR_BUILD_KEY;
    else process.env.NOTIFICATOR_BUILD_KEY = originalApiKey;
  });

  const integration = notificator({
    apiKeyEnv: "NOTIFICATOR_BUILD_KEY",
    notifyOnBuild: {
      title: "Website deployed",
      data: { environment: "production" },
    },
  });
  const info = [];
  const warn = [];

  await integration.hooks["astro:build:done"]?.({
    pages: [{ pathname: "/" }, { pathname: "/about/" }],
    dir: new URL("file:///tmp/dist/"),
    assets: new Map(),
    logger: {
      info: (message) => info.push(message),
      warn: (message) => warn.push(message),
    },
  });

  assert.equal(body.title, "Website deployed");
  assert.equal(body.source, "astro:build");
  assert.deepEqual(body.data, {
    routesGenerated: 2,
    environment: "production",
  });
  assert.deepEqual(info, ["Successful build notification sent."]);
  assert.deepEqual(warn, []);
});
