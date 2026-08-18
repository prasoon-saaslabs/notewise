/** Public marketing-site URLs. NEXT_PUBLIC_* values are baked in at build time — never put secrets here. */

export const GITHUB_URL = (
  process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/prasoon-saaslabs/notewise"
).replace(/\/$/, "");

export const DMG_URL_ARM = (process.env.NEXT_PUBLIC_DMG_URL || "").trim();
export const DMG_URL_INTEL = (process.env.NEXT_PUBLIC_DMG_URL_INTEL || "").trim();

export function githubCloneCommand(): string {
  const url = GITHUB_URL.endsWith(".git") ? GITHUB_URL : `${GITHUB_URL}.git`;
  return `git clone ${url} && cd notewise`;
}
