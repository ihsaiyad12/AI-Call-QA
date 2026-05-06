'use client';

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { useEffect, useRef } from 'react';

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

function InactivityTimeoutWrapper({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only track inactivity if the user is logged in
    if (!session) return;

    const handleActivity = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        // Log out the user due to inactivity
        signOut({ callbackUrl: '/login' });
      }, INACTIVITY_TIMEOUT_MS);
    };

    // Initialize the timeout immediately upon rendering
    handleActivity();

    // Attach event listeners for user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, handleActivity));

    // Cleanup listeners and timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [session]);

  return <>{children}</>;
}

export default function NextAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <InactivityTimeoutWrapper>
        {children}
      </InactivityTimeoutWrapper>
    </SessionProvider>
  );
}
