'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, BarChart3, ClipboardList } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role;

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <div style={styles.logoGroup}>
          <Link href="/" style={styles.logoLink}>
            <Image
              src="/x-engage_logo.webp"
              alt="x-engage"
              width={32}
              height={32}
              style={{ objectFit: 'contain' }}
              priority
            />
            <span style={styles.logoText}>
              <span style={{ color: 'var(--color-primary)' }}>x</span>-engage
            </span>
          </Link>
        </div>

        {/* Navigation + User Actions */}
        {session && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Role-based nav links */}
            {role === 'analyst' && (
              <Link href="/" style={{
                ...styles.navLink,
                color: pathname === '/' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: pathname === '/' ? '2px solid var(--color-primary)' : '2px solid transparent',
              }}>
                <BarChart3 size={14} /> Call QA
              </Link>
            )}
            {role === 'agent' && (
              <Link href="/agent" style={{
                ...styles.navLink,
                color: pathname === '/agent' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: pathname === '/agent' ? '2px solid var(--color-primary)' : '2px solid transparent',
              }}>
                <ClipboardList size={14} /> Lead Intake
              </Link>
            )}

            <div style={styles.divider} />

            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-main)' }}>
              Hello, {session.user?.name}
            </span>
            <button 
              onClick={() => signOut()}
              style={styles.signOutBtn}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-red-bg)';
                e.currentTarget.style.color = 'var(--color-red)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-main)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    width: '100%',
    backgroundColor: 'var(--color-bg-card)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--color-border)',
    boxShadow: '0 1px 12px var(--color-shadow)',
  },
  inner: {
    maxWidth: '1400px',
    width: '95%',
    margin: '0 auto',
    padding: '0 20px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },
  logoText: {
    fontFamily: 'var(--font-outfit)',
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.02em',
    textTransform: 'lowercase',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '600',
    textDecoration: 'none',
    padding: '6px 0',
    transition: 'all 0.2s',
  },
  divider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'var(--color-border)',
  },
  signOutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--color-text-main)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
