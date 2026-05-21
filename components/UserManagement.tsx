'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, Users, ShieldAlert, Loader2, Trash2, 
  UserCheck, AlertCircle, CheckCircle2, Shield, Calendar 
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface UserRecord {
  id: string;
  username: string;
  role: 'agent' | 'analyst' | 'super-admin';
  createdAt: string;
}

export default function UserManagement() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // tracks user ID being deleted
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'agent' | 'analyst' | 'super-admin'>('analyst');

  // Stats
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'super-admin').length,
    analysts: users.filter(u => u.role === 'analyst').length,
    agents: users.filter(u => u.role === 'agent').length,
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to retrieve user directory');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLoading) return;

    setSubmitLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register user');
      }

      setSuccess(`User "${username}" created successfully!`);
      setUsername('');
      setPassword('');
      setRole('analyst');
      fetchUsers(); // Refresh list

      // Clear success notification after 4s
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, targetUsername: string) => {
    if (confirm(`Are you absolutely sure you want to delete user "${targetUsername}"?`)) {
      setActionLoading(userId);
      setError(null);
      setSuccess(null);

      try {
        const res = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete user');
        }

        setSuccess(`User "${targetUsername}" deleted successfully.`);
        fetchUsers();

        setTimeout(() => setSuccess(null), 4000);
      } catch (err: any) {
        setError(err.message || 'Failed to delete user');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const getRoleBadge = (userRole: string) => {
    const isSelf = session?.user?.name?.toLowerCase() === username.toLowerCase();
    
    switch (userRole) {
      case 'super-admin':
        return (
          <span style={{ 
            ...styles.badge, 
            backgroundColor: 'rgba(167, 139, 250, 0.1)', 
            color: 'rgb(167, 139, 250)', 
            border: '1px solid rgba(167, 139, 250, 0.2)' 
          }}>
            <Shield size={12} style={{ marginRight: '4px' }} /> Super Admin
          </span>
        );
      case 'analyst':
        return (
          <span style={{ 
            ...styles.badge, 
            backgroundColor: 'rgba(99, 102, 241, 0.1)', 
            color: 'rgb(129, 140, 248)', 
            border: '1px solid rgba(99, 102, 241, 0.2)' 
          }}>
            Analyst
          </span>
        );
      case 'agent':
        return (
          <span style={{ 
            ...styles.badge, 
            backgroundColor: 'rgba(245, 158, 11, 0.1)', 
            color: 'rgb(251, 191, 36)', 
            border: '1px solid rgba(245, 158, 11, 0.2)' 
          }}>
            Agent
          </span>
        );
      default:
        return <span style={styles.badge}>{userRole}</span>;
    }
  };

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--color-primary)' }} />
        <p style={{ marginTop: '16px', color: 'var(--color-text-muted)', fontSize: '15px' }}>Retrieving user directory...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={styles.container}
    >
      <div style={{ marginBottom: '32px' }}>
        <h1 style={styles.title}>User Management</h1>
        <p style={styles.subtitle}>Create, manage, and audit administrative, analyst, and call agent accounts.</p>
      </div>

      {/* Symmetric Key Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Total Users</span>
            <span style={styles.statValue}>{stats.total}</span>
          </div>
          <div style={styles.statIconWrapper}>
            <Users size={20} color="var(--color-primary)" />
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Super Admins</span>
            <span style={styles.statValue}>{stats.admins}</span>
          </div>
          <div style={styles.statIconWrapper}>
            <Shield size={20} color="rgb(167, 139, 250)" />
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Quality Analysts</span>
            <span style={styles.statValue}>{stats.analysts}</span>
          </div>
          <div style={styles.statIconWrapper}>
            <UserCheck size={20} color="rgb(129, 140, 248)" />
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statInfo}>
            <span style={styles.statLabel}>Call Agents</span>
            <span style={styles.statValue}>{stats.agents}</span>
          </div>
          <div style={styles.statIconWrapper}>
            <Users size={20} color="rgb(251, 191, 36)" />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={styles.mainLayout}>
        {/* Create User Form - Left Panel */}
        <div style={styles.formPanel}>
          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <UserPlus size={18} color="var(--color-primary)" />
              <h3 style={styles.cardTitle}>Create New Account</h3>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }}
                  style={styles.errorBox}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </motion.div>
              )}

              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0 }}
                  style={styles.successBox}
                >
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleCreateUser} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. janesmith"
                  style={styles.input}
                  required
                  disabled={submitLoading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={styles.input}
                  required
                  disabled={submitLoading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>System Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  style={styles.select}
                  disabled={submitLoading}
                >
                  <option value="analyst">Quality Analyst</option>
                  <option value="agent">Call Agent</option>
                  <option value="super-admin">Super Admin</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="primary-button"
                disabled={submitLoading || !username.trim() || !password.trim()}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  height: '46px',
                  marginTop: '8px'
                }}
              >
                {submitLoading ? <Loader2 size={18} className="spin" /> : 'Register User'}
              </button>
            </form>
          </div>
        </div>

        {/* User Directory Table - Right Panel */}
        <div style={styles.tablePanel}>
          <div className="card" style={{ ...styles.card, padding: 0 }}>
            <div style={{ ...styles.cardHeader, padding: '24px 24px 16px 24px' }}>
              <Users size={18} color="var(--color-primary)" />
              <h3 style={styles.cardTitle}>User Directory</h3>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Created On</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSelf = session?.user?.name?.toLowerCase() === user.username.toLowerCase();
                    return (
                      <tr key={user.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={styles.userCol}>
                            <div style={{
                              ...styles.avatar,
                              backgroundColor: isSelf ? 'rgba(139, 92, 246, 0.15)' : 'var(--color-bg-hover)',
                              color: isSelf ? 'var(--color-primary)' : 'var(--color-text-muted)'
                            }}>
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div style={styles.userDetails}>
                              <span style={styles.username}>
                                {user.username} {isSelf && <span style={styles.selfTag}>(You)</span>}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          {getRoleBadge(user.role)}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.dateCol}>
                            <Calendar size={13} style={{ color: 'var(--color-text-dim)' }} />
                            <span>{new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          {isSelf ? (
                            <div style={styles.selfLabel}>
                              <UserCheck size={12} /> Active Session
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              disabled={actionLoading === user.id}
                              style={styles.deleteBtn}
                              className="delete-btn"
                              title={`Delete ${user.username}`}
                            >
                              {actionLoading === user.id ? (
                                <Loader2 size={14} className="spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No users registered in the database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 32px 32px',
    maxWidth: '1600px',
    margin: '0 auto',
    minHeight: 'calc(100vh - 40px)'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    marginBottom: '4px',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--color-text-muted)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '32px'
  },
  statCard: {
    backgroundColor: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 8px 30px var(--color-shadow)',
    transition: 'transform 0.2s ease',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.5px',
    lineHeight: 1.1
  },
  statIconWrapper: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-bg-hover)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: '32px',
    alignItems: 'start'
  },
  formPanel: {
    width: '100%'
  },
  tablePanel: {
    width: '100%'
  },
  card: {
    padding: '28px',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '16px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 8px 30px var(--color-shadow)'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-main)'
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: 'var(--color-bg-app)',
    color: 'var(--color-text-main)',
    transition: 'border-color 0.2s',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-app)',
    fontSize: '14px',
    color: 'var(--color-text-main)',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer'
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    color: 'var(--color-red)',
    padding: '12px 14px',
    borderRadius: '10px',
    marginBottom: '16px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    fontWeight: '500',
    lineHeight: '1.4'
  },
  successBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    color: 'var(--color-green)',
    padding: '12px 14px',
    borderRadius: '10px',
    marginBottom: '16px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid rgba(34, 197, 94, 0.15)',
    fontWeight: '500',
    lineHeight: '1.4'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    textAlign: 'left'
  },
  th: {
    padding: '14px 24px',
    backgroundColor: 'var(--color-bg-sidebar)',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-card)',
    transition: 'background-color 0.15s ease'
  },
  td: {
    padding: '16px 24px',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '14px',
    color: 'var(--color-text-main)'
  },
  userCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    border: '1px solid var(--color-border)'
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  username: {
    fontWeight: '600',
    color: 'var(--color-text-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  selfTag: {
    fontSize: '11px',
    color: 'var(--color-primary)',
    fontWeight: '600'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '20px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  dateCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'var(--color-text-muted)'
  },
  selfLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--color-primary)',
    fontWeight: '600',
    fontStyle: 'italic',
    padding: '6px 10px',
    borderRadius: '6px',
    backgroundColor: 'var(--color-primary-light)'
  },
  deleteBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '8px',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  centerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '100px 20px',
    minHeight: '60vh'
  }
};
