/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Apple Silicon (or universal) GitHub Release asset URL */
  readonly VITE_DMG_URL?: string;
  /** Optional Intel Mac GitHub Release asset URL */
  readonly VITE_DMG_URL_INTEL?: string;
  /** Public GitHub repo URL, e.g. https://github.com/prasoon-saaslabs/notewise */
  readonly VITE_GITHUB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
