import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    // Workspace packages live outside apps/web and are imported as TypeScript
    // source, so the dev server has to be allowed to read them.
    fs: { allow: [repoRoot] },
  },
});
