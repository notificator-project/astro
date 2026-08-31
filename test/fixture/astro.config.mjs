import { defineConfig } from "astro/config";

import notificator from "../../dist/index.js";

export default defineConfig({
  integrations: [notificator()],
});
