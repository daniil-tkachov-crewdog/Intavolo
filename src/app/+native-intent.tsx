/** Android's Google OAuth redirect (intavolo://auth#…) is handled by the browser session in auth.tsx; just land on the root. iOS uses native sign-in. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return /^([a-z]+:\/\/)?\/?auth\b/.test(path) || path.includes('://auth') ? '/' : path;
}
