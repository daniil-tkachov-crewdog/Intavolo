import { Redirect } from 'expo-router';

/** Landing for the Google OAuth redirect (intavolo://auth); the browser session handles the code. */
export default function AuthRedirect() {
  return <Redirect href="/" />;
}
