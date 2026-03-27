'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../lib/firebase-config';
import { useAuth, UserRole } from '../lib/auth-context';
import { Badge, Card } from './ui';
import type { InvitedUser } from '../lib/types';

export default function AdminPanel() {
  const { isAdmin, profile } = useAuth();
  const [users, setUsers] = useState<InvitedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('observer');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'mission-control-users'));
      const userData = snapshot.docs.map(d => d.data() as InvitedUser);
      setUsers(userData);
    } catch (err) {
      console.error('Error loading users:', err);
    }
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName || !invitePassword) return;
    if (invitePassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    setInviting(true);
    setMessage(null);

    try {
      // Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, inviteEmail, invitePassword);

      // Create Firestore profile
      const userProfile: InvitedUser = {
        uid: cred.user.uid,
        email: inviteEmail,
        role: inviteRole,
        displayName: inviteName,
        invitedBy: profile?.displayName || 'Admin',
        invitedAt: new Date().toISOString(),
        lastLogin: '',
        active: true,
      };

      await setDoc(doc(db, 'mission-control-users', cred.user.uid), userProfile);

      setMessage({ type: 'success', text: `Invited ${inviteName} (${inviteEmail}) as ${inviteRole}.` });
      setInviteEmail('');
      setInviteName('');
      setInvitePassword('');
      setInviteRole('observer');
      loadUsers();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setMessage({ type: 'error', text: 'Email already in use.' });
      } else if (code === 'auth/invalid-email') {
        setMessage({ type: 'error', text: 'Invalid email address.' });
      } else {
        setMessage({ type: 'error', text: `Error: ${err?.message || 'Unknown error'}` });
      }
    }
    setInviting(false);
  };

  const toggleActive = async (user: InvitedUser) => {
    try {
      await updateDoc(doc(db, 'mission-control-users', user.uid), { active: !user.active });
      setMessage({ type: 'success', text: `${user.displayName} ${user.active ? 'deactivated' : 'reactivated'}.` });
      loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error updating user status.' });
    }
  };

  const changeRole = async (user: InvitedUser, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'mission-control-users', user.uid), { role: newRole });
      setMessage({ type: 'success', text: `${user.displayName} role changed to ${newRole}.` });
      loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error changing role.' });
    }
  };

  if (!isAdmin) {
    return <div className="text-red-500 font-mono text-sm">ACCESS DENIED — Admin only.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="text-lg">&#x1F6E1;&#xFE0F;</span>
        <h2 className="text-lg font-bold text-cyan-400 tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          ADMIN PANEL
        </h2>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Invite Form */}
      <Card title="Invite New User" icon="&#x1F4E8;" accent="#3b82f6" full>
        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Display Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="Agent name"
                required
                className="w-full px-3 py-2 bg-[#0a0e17] border border-[#2a3550] rounded-md text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="agent@email.com"
                required
                className="w-full px-3 py-2 bg-[#0a0e17] border border-[#2a3550] rounded-md text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Temporary Password</label>
              <input
                type="text"
                value={invitePassword}
                onChange={e => setInvitePassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
                className="w-full px-3 py-2 bg-[#0a0e17] border border-[#2a3550] rounded-md text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-[#0a0e17] border border-[#2a3550] rounded-md text-sm text-slate-200 outline-none"
              >
                <option value="observer">Observer (read-only)</option>
                <option value="analyst">Analyst (read + notebook)</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-md text-sm transition-all"
          >
            {inviting ? 'Creating Account...' : 'Invite User'}
          </button>
        </form>
      </Card>

      {/* User List */}
      <Card title={`Active Users (${users.length})`} icon="&#x1F465;" accent="#8b5cf6" full>
        {loading ? (
          <div className="text-sm text-slate-500 text-center py-4">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-4">No users found. Invite the first one above.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map(u => (
              <div
                key={u.uid}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[.02] border border-white/[.04]"
                style={{ opacity: u.active ? 1 : 0.5 }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{u.displayName}</span>
                    <Badge level={u.role === 'admin' ? 'RED' : u.role === 'analyst' ? 'AMBER' : 'GREEN'} small />
                    {!u.active && <span className="text-[9px] text-red-500 font-mono">DEACTIVATED</span>}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {u.email} &bull; Invited by {u.invitedBy} &bull; {u.invitedAt ? new Date(u.invitedAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    onChange={e => changeRole(u, e.target.value as UserRole)}
                    className="bg-[#0a0e17] border border-[#2a3550] rounded px-2 py-1 text-[10px] text-slate-300 outline-none"
                  >
                    <option value="observer">Observer</option>
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => toggleActive(u)}
                    className={`text-[10px] font-mono px-2 py-1 rounded ${
                      u.active
                        ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                        : 'text-green-400 bg-green-500/10 hover:bg-green-500/20'
                    }`}
                  >
                    {u.active ? 'DEACTIVATE' : 'REACTIVATE'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Role Descriptions */}
      <Card title="Role Permissions" icon="&#x1F511;" accent="#06b6d4" full>
        <div className="grid grid-cols-3 gap-3">
          {[
            { role: 'Admin', color: '#ef4444', perms: 'Full read/write access. Can invite users, manage roles, add notebook entries, modify operational data.' },
            { role: 'Analyst', color: '#f59e0b', perms: 'Read access + downloads. Can add notebook entries. Cannot modify operational data or invite users.' },
            { role: 'Observer', color: '#10b981', perms: 'Read-only access. Can view all intel and download evidence. Cannot add entries or modify anything.' },
          ].map((r, i) => (
            <div key={i} className="p-3 rounded-lg bg-white/[.02] border border-white/[.03]" style={{ borderTop: `2px solid ${r.color}` }}>
              <div className="text-xs font-semibold mb-1" style={{ color: r.color }}>{r.role}</div>
              <div className="text-[10px] text-slate-400 leading-relaxed">{r.perms}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
