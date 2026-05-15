'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';

function LoginForm() {
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  // If already logged in, redirect to appropriate page
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = (session.user as any).role;
      if (role === 'agent') {
        router.push('/agent');
      } else {
        router.push('/');
      }
    }
  }, [status, session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn('credentials', {
        redirect: false,
        username: username.trim(),
        password: password.trim(),
        callbackUrl,
      });

      if (res?.error) {
        setError('Invalid username or password');
        setIsLoading(false);
      } else if (res?.ok) {
        window.location.href = res.url || callbackUrl;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <>
      <div style={styles.iconHeader}>
        <div style={styles.lockCircle}>
          <ShieldCheck size={28} color="var(--color-primary)" />
        </div>
      </div>
      
      <h2 className="outfit-font" style={{ textAlign: 'center', marginBottom: '12px', fontSize: '28px', fontWeight: '800', color: 'var(--color-text-main)', letterSpacing: '-0.5px' }}>
        Call QA
      </h2>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '32px', fontSize: '15px' }}>
        Sign in to manage your call quality insights.
      </p>

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <label style={styles.label}>Username</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Enter your username"
            style={styles.input}
            disabled={isLoading}
          />
        </div>

        <div>
          <label style={styles.label}>Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            style={styles.input}
            disabled={isLoading}
          />
        </div>

        <button 
          type="submit" 
          className="primary-button" 
          disabled={isLoading || !username.trim() || !password.trim()}
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '8px', height: '52px', fontSize: '16px' }}
        >
          {isLoading ? <Loader2 size={20} className="spin" /> : 'Access Dashboard'}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div style={styles.container}>
      {/* Abstract Background Decoration */}
      <div style={styles.bgBlob1} />
      <div style={styles.bgBlob2} />
      
      <div className="card fade-in" style={styles.card}>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 size={32} className="spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        }>
          <LoginForm />
        </Suspense>
        <p style={{ marginTop: '32px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
          By logging in, you agree to our Terms of Service.<br />
          Contact support for access issues.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-bg-app)',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '48px 40px',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '24px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 25px 50px -12px var(--color-shadow)',
    zIndex: 10,
    position: 'relative',
    backdropFilter: 'blur(10px)',
  },
  iconHeader: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  lockCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '18px',
    backgroundColor: 'var(--color-primary-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '10px',
    color: 'var(--color-text-main)',
    letterSpacing: '0.3px',
  },
  input: {
    width: '100%',
    height: '50px',
    padding: '0 16px',
    backgroundColor: 'var(--color-bg-hover)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    color: 'var(--color-text-main)',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  errorBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    color: 'var(--color-red)',
    padding: '14px',
    borderRadius: '12px',
    marginBottom: '24px',
    fontSize: '14px',
    textAlign: 'center',
    border: '1px solid rgba(244, 63, 94, 0.2)',
    fontWeight: '600',
  },
  bgBlob1: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '40%',
    height: '40%',
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0) 70%)',
    zIndex: 1,
  },
  bgBlob2: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: '40%',
    height: '40%',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0) 70%)',
    zIndex: 1,
  }
};
