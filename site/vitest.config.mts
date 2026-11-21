import react from "@vitejs/plugin-react";
import vike from "vike/plugin";
import { defineConfig } from "vitest/config";

// The pages render in Node for the tests; the Worker's bindings are faked in the edge tests.
export default defineConfig({
  plugins: [vike(), react()],
  test: { environment: "node" },
});
