import { useState } from 'react';
import { getSession } from './auth';

// Reads the session ONCE (lazy initializer) so the returned object has a
// stable reference across re-renders. Calling getSession() directly in the
// component body returns a fresh parsed object every render, which thrashes
// any useEffect that depends on values derived from it.
export function useSession() {
  const [session] = useState(getSession);
  return session;
}
