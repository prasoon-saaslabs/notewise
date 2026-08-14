/** Public marketing-site URLs. All VITE_* values are baked in at build time — never put secrets here. */

export const GITHUB_URL = (
  import.meta.env.VITE_GITHUB_URL || "https://github.com/prasoon-saaslabs/notewise"
).replace(/\/$/, "");

export const DMG_URL_ARM = (import.meta.env.VITE_DMG_URL || "").trim();
export const DMG_URL_INTEL = (import.meta.env.VITE_DMG_URL_INTEL || "").trim();

export function githubCloneCommand(): string {
  const url = GITHUB_URL.endsWith(".git") ? GITHUB_URL : `${GITHUB_URL}.git`;
  return `git clone ${url} && cd notewise`;
}
