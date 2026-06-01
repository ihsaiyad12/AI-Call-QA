'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Loader2 } from 'lucide-react';
import AgentLeadForm from '@/components/AgentLeadForm';
import axios from 'axios';

export default function AgentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isResettingDb, setIsResettingDb] = useState(false);
  const isSandbox = process.env.NEXT_PUBLIC_USE_DUMMY_DB === 'true';

  const handleResetSandboxDb = async () => {
    if (!confirm('Are you sure you want to clear and reset the sandbox database? All your changes will be reset.')) {
      return;
    }
    setIsResettingDb(true);
    try {
      const res = await axios.post('/api/tester/db-reset');
      if (res.data.success) {
        alert('Sandbox database successfully restored!');
        window.location.reload();
      } else {
        alert('Failed to reset: ' + (res.data.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error(err);
      alert('Error resetting database: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsResettingDb(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div style={styles.centerContainer}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--color-primary)' }} />
        <p style={{ marginTop: '16px', color: 'var(--color-text-muted)', fontSize: '15px' }}>Verifying session...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {isSandbox && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.03) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '16px',
          padding: '14px 24px',
          marginBottom: '28px',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.02)',
          backdropFilter: 'blur(10px)',
          marginTop: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="pulse-sandbox-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)' }}>
              🧪 Sandbox Active: Connected to <code style={{ fontFamily: 'monospace', backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-primary)' }}>Call_QA_dummy</code>
            </span>
          </div>
          <button 
            onClick={handleResetSandboxDb}
            disabled={isResettingDb}
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              color: 'var(--color-primary)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.1)';
              e.currentTarget.style.color = 'var(--color-primary)';
            }}
          >
            Reset Sandbox Data
          </button>
        </div>
      )}

      {isResettingDb && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <Loader2 size={48} className="spin" style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--color-text-main)', fontSize: '18px', fontWeight: '800' }}>
            Restoring Sandbox Database...
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '8px' }}>
            Seeding default users and leads dataset
          </p>
        </div>
      )}
      {/* Premium Profile & Logout Header Bar */}
      <header style={styles.topBar}>
        <div style={styles.agentInfo}>
          <div style={styles.avatar}>
            <User size={18} color="var(--color-primary)" />
          </div>
          <div style={styles.details}>
            <div style={styles.name}>{session.user?.name}</div>
            <div style={styles.roleTag}>
              {(session.user as any)?.role === 'super-admin' ? 'Super Admin' : 'Call Agent'}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={styles.signOutBtn}
          className="signout-btn"
          title="Sign Out"
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-red-bg)';
            e.currentTarget.style.color = 'var(--color-red)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-card)';
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Title */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 className="outfit-font" style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px', color: 'var(--color-text-main)' }}>
          Lead Intake Form
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', maxWidth: '600px', margin: '0 auto' }}>
          Submit lead details after your call. The quality analyst will review and score the recording.
        </p>
      </div>

      <main>
        <AgentLeadForm />
      </main>

      <footer style={{ marginTop: '80px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
        <p>A product by x-engage</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '16px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 8px 30px var(--color-shadow)',
    marginBottom: '48px',
    marginTop: '20px',
    backdropFilter: 'blur(20px)',
  },
  agentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-bg-hover)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--color-border)',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
  },
  name: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--color-text-main)',
  },
  roleTag: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  signOutBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    color: 'var(--color-text-muted)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px var(--color-shadow)',
  },
  centerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: 'var(--color-bg-app)',
  }
};
