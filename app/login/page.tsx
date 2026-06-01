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
  const isSandbox = process.env.NEXT_PUBLIC_USE_DUMMY_DB === 'true';

  return (
    <div style={{
      ...styles.container,
      flexDirection: isSandbox ? 'row' : 'column',
      flexWrap: 'wrap',
      gap: '40px',
    }}>
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

      {isSandbox && (
        <div className="card fade-in" style={styles.sandboxCard}>
          <div style={styles.sandboxHeader}>
            <div className="pulse-sandbox-dot" style={styles.sandboxDot} />
            <h3 className="outfit-font" style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--color-primary)' }}>
              Sandbox Mode Active
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
            You are connected to the dummy database <code style={styles.codeInline}>Call_QA_dummy</code>. Use these pre-seeded accounts to test different roles:
          </p>

          <div style={styles.credentialsList}>
            <div style={styles.credentialRow}>
              <div style={styles.roleHeader}>🔑 Super Admin (Full Control)</div>
              <div style={styles.credentialDetail}>
                <div><strong>Username:</strong> <code style={styles.code}>admin</code></div>
                <div><strong>Password:</strong> <code style={styles.code}>admin@523523</code></div>
              </div>
            </div>

            <div style={styles.credentialRow}>
              <div style={styles.roleHeader}>📊 Quality Analyst (Review & Score)</div>
              <div style={styles.credentialDetail}>
                <div><strong>Username:</strong> <code style={styles.code}>analyst</code></div>
                <div><strong>Password:</strong> <code style={styles.code}>analyst123</code></div>
              </div>
            </div>

            <div style={styles.credentialRow}>
              <div style={styles.roleHeader}>📞 Call Agent (Intake Form only)</div>
              <div style={styles.credentialDetail}>
                <div><strong>Username:</strong> <code style={styles.code}>agent</code></div>
                <div><strong>Password:</strong> <code style={styles.code}>agent123</code></div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--color-text-dim)', textAlign: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '12px', lineHeight: '1.4' }}>
            🧪 Pre-populated leads database is ready for analytics and search testing.
          </div>
        </div>
      )}
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
  sandboxCard: {
    width: '100%',
    maxWidth: '400px',
    padding: '36px 30px',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '24px',
    border: '1px solid rgba(139, 92, 246, 0.25)',
    boxShadow: '0 25px 50px -12px var(--color-shadow)',
    zIndex: 10,
    position: 'relative',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  sandboxHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  sandboxDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 10px #10b981',
  },
  credentialsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  credentialRow: {
    padding: '12px 14px',
    backgroundColor: 'var(--color-bg-hover)',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
  },
  roleHeader: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    marginBottom: '6px',
    letterSpacing: '-0.2px',
  },
  credentialDetail: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    color: 'var(--color-primary)',
    fontWeight: '600',
    fontSize: '12px',
  },
  codeInline: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '2px 4px',
    borderRadius: '4px',
    color: 'var(--color-text-main)',
    fontSize: '12px',
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
