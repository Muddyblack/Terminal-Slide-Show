/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL: string
  /** 'true' builds the GitHub Pages demo (made-up data, no backend) */
  readonly VITE_DEMO_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Version of the app, from the root package.json (see scripts/version.mjs) */
declare const __APP_VERSION__: string
