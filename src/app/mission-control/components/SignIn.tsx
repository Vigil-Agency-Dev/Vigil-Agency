'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';

export default function SignIn() {
  const { login, loginWithGoogle, error, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // Error handled in context
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060a12] relative overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <img
            src="/images/brand/vigil-logo.png"
            alt="VIGIL"
            className="w-20 h-20 mb-4 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          />
          <h1
            className="text-3xl font-bold tracking-[0.3em] text-cyan-400"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            VIGIL
          </h1>
          <p
            className="text-sm text-slate-400 mt-1 tracking-[0.15em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Mission Control
          </p>
          <p className="text-slate-600 text-xs mt-2 italic">Keeping Watch Through The Darkness</p>
        </div>

        {/* Sign In Card */}
        <div className="bg-[#111827] border border-[#2a3550] rounded-2xl p-8 shadow-2xl">
          {/* Google Sign-In */}
          <button
            type="button"
            onClick={loginWithGoogle}
            disabled={submitting || loading}
            className="w-full py-3 mb-5 flex items-center justify-center gap-3 bg-white/[.05] hover:bg-white/[.08] disabled:opacity-50 border border-[#2a3550] rounded-lg transition-all text-sm text-slate-300"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-[#2a3550]" />
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">or</span>
            <div className="flex-1 border-t border-[#2a3550]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-[#0a0e17] border border-[#2a3550] rounded-lg text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-[#0a0e17] border border-[#2a3550] rounded-lg text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-all text-sm tracking-wide"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#2a3550]">
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              This system is invite-only. No registration is available.
              <br />
              If you need access, contact the administrator.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p
            className="text-[10px] text-slate-600 tracking-wider"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            VIGIL &bull; EST. 2026
          </p>
        </div>
      </div>
    </div>
  );
}
