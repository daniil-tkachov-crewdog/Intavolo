/** The Google OAuth redirect (intavolo://auth?code=…) is handled by the browser session in auth.tsx; just land on the root. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return /^([a-z]+:\/\/)?\/?auth\b/.test(path) || path.includes('://auth') ? '/' : path;
}
