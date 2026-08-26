/// <reference types="vite/client" />

/**
 * Only public values belong here — everything in `import.meta.env` is compiled
 * into the bundle and served to every visitor. Secrets stay in the API's
 * environment.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
