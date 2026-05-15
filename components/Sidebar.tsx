'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic2, User, ChevronLeft, ChevronRight, PieChart, Database, LogOut, Sun, Moon } from 'lucide-react';
import Image from 'next/image';
import { signOut } from 'next-auth/react';

interface SidebarProps {
  activeView: 'analytics' | 'dashboard' | 'analyzer';
  onViewChange: (view: 'analytics' | 'dashboard' | 'analyzer') => void;
  userName?: string | null;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ activeView, onViewChange, userName, isCollapsed, setIsCollapsed }: SidebarProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme as 'dark' | 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const mainItems = [
    { id: 'analytics', label: 'Analytics', icon: <PieChart size={20} /> },
    { id: 'dashboard', label: 'Leads Database', icon: <Database size={20} /> },
  ];

  const toolItems = [
    { id: 'analyzer', label: 'Call Analyzer', icon: <Mic2 size={20} /> },
  ];

  return (
    <motion.aside 
      initial={false}
      animate={{ 
        width: isCollapsed ? 80 : 260,
      }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      style={styles.sidebar}
    >
      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)} 
        style={styles.toggleBtn}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div style={styles.topSection}>
        {/* Logo Area */}
        <div style={{ ...styles.logoContainer, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <div style={styles.logoIcon}>
            <Image
              src="/x-engage_logo.webp"
              alt="x-engage logo"
              width={38}
              height={38}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={styles.logoText}
            >
              <span style={{ color: 'var(--color-primary)' }}>x</span>-engage
            </motion.span>
          )}
        </div>

        <div style={styles.menuList}>
          {!isCollapsed && <div style={styles.menuTitle}>Dashboard</div>}
          {mainItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id as any)}
                style={{
                  ...styles.menuItem,
                  backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--color-text-muted)',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  padding: isCollapsed ? '12px' : '12px 16px',
                  boxShadow: isActive ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none',
                }}
                title={isCollapsed ? item.label : ""}
              >
                <span style={{ display: 'flex', color: 'inherit', transition: 'color 0.2s' }}>{item.icon}</span>
                {!isCollapsed && <span style={{ ...styles.menuLabel, color: 'inherit' }}>{item.label}</span>}
                {isActive && !isCollapsed && (
                  <motion.div layoutId="activeHighlight" style={styles.activeIndicator} />
                )}
              </button>
            );
          })}

          <div style={{ margin: '12px 0' }} />
          {!isCollapsed && <div style={styles.menuTitle}>Tools & Intelligence</div>}
          {toolItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id as any)}
                style={{
                  ...styles.menuItem,
                  backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--color-text-muted)',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  padding: isCollapsed ? '12px' : '12px 16px',
                  boxShadow: isActive ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none',
                }}
                title={isCollapsed ? item.label : ""}
              >
                <span style={{ display: 'flex', color: 'inherit', transition: 'color 0.2s' }}>{item.icon}</span>
                {!isCollapsed && <span style={{ ...styles.menuLabel, color: 'inherit' }}>{item.label}</span>}
                {isActive && !isCollapsed && (
                  <motion.div layoutId="activeHighlight" style={styles.activeIndicator} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={styles.bottomSection}>
        {/* User Profile */}
        <div style={{ ...styles.userProfile, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <div style={styles.avatar}>
            <User size={18} color="var(--color-primary)" />
          </div>
          {!isCollapsed && (
            <div style={styles.userInfo}>
              <div style={styles.userName}>{userName || 'Analyst'}</div>
              <div style={styles.userRole}>Quality Analyst</div>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          style={{ 
            ...styles.menuItem, 
            justifyContent: isCollapsed ? 'center' : 'flex-start', 
            padding: isCollapsed ? '12px' : '12px 16px',
            marginBottom: '4px',
            color: theme === 'dark' ? '#fbbf24' : '#6366f1', // Amber for sun, Indigo for moon
          }}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {theme === 'dark' ? <Sun size={18} fill="currentColor" fillOpacity={0.2} /> : <Moon size={18} fill="currentColor" fillOpacity={0.2} />}
          {!isCollapsed && <span style={styles.menuLabel}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Sign Out Button */}
        <button 
          onClick={() => signOut()}
          style={{ 
            ...styles.menuItem, 
            ...styles.signOutBtn,
            justifyContent: isCollapsed ? 'center' : 'flex-start', 
            padding: isCollapsed ? '12px' : '12px 16px' 
          }}
          title="Sign Out"
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-red-bg)';
            e.currentTarget.style.color = 'var(--color-red)';
            const icon = e.currentTarget.querySelector('svg');
            if (icon) (icon as any).style.color = 'var(--color-red)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-muted)';
            const icon = e.currentTarget.querySelector('svg');
            if (icon) (icon as any).style.color = 'inherit';
          }}
        >
          <LogOut size={18} />
          {!isCollapsed && <span style={styles.menuLabel}>Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    backgroundColor: 'var(--color-bg-sidebar)',
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '32px 0 24px 0',
    zIndex: 90,
    boxShadow: '20px 0 50px var(--color-shadow)',
  },
  toggleBtn: {
    position: 'absolute',
    right: '-14px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    width: '28px', 
    height: '56px', 
    borderRadius: '14px', 
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)', 
    color: 'var(--color-text-muted)', 
    cursor: 'pointer',
    boxShadow: '0 4px 12px var(--color-shadow)',
    zIndex: 100,
  },
  topSection: { 
    display: 'flex', 
    flexDirection: 'column',
    padding: '0 16px',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
    padding: '0 8px',
    height: '48px',
  },
  logoIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.3))',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.5px',
    whiteSpace: 'nowrap',
  },
  menuList: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '10px' 
  },
  menuItem: {
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    borderRadius: '12px', 
    border: 'none', 
    cursor: 'pointer', 
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative', 
    textAlign: 'left', 
    width: '100%',
    backgroundColor: 'transparent',
  },
  menuLabel: { 
    fontSize: '14px', 
    fontWeight: '600', 
    whiteSpace: 'nowrap',
  },
  menuTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: '12px 16px 8px',
  },
  activeIndicator: {
    position: 'absolute',
    right: '8px',
    width: '4px',
    height: '16px',
    borderRadius: '2px',
    backgroundColor: 'var(--color-primary)',
    opacity: 1,
  },
  bottomSection: { 
    borderTop: '1px solid var(--color-border)', 
    padding: '24px 16px 0', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '16px' 
  },
  userProfile: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px' 
  },
  avatar: {
    width: '40px', 
    height: '40px', 
    borderRadius: '12px', 
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    flexShrink: 0,
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  userInfo: { 
    display: 'flex', 
    flexDirection: 'column', 
    overflow: 'hidden' 
  },
  userName: { 
    fontSize: '14px', 
    fontWeight: '700', 
    color: 'var(--color-text-main)', 
    whiteSpace: 'nowrap' 
  },
  userRole: { 
    fontSize: '11px', 
    color: 'var(--color-text-muted)', 
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  signOutBtn: {
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    borderRadius: '12px', 
    border: 'none', 
    cursor: 'pointer', 
    transition: 'all 0.2s ease',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    width: '100%',
  }
};
