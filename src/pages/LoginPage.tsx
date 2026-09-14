import React, { useState } from 'react';
import { Package, Shield, Lock, Mail, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { login, signup, switchDemoRole, signInWithGoogle } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        if (!displayName.trim()) {
          setError('Please provide your name.');
          setLoading(false);
          return;
        }
        await signup(email.trim(), password, displayName.trim());
      } else {
        await login(email.trim(), password);
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No user account found with this email.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = (role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF') => {
    switchDemoRole(role);
    if (onLoginSuccess) onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Ribbon */}
        <div className="p-8 pb-6 text-center border-b border-slate-100 bg-slate-50/50">
          <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center text-sm font-bold text-white shadow-xs mx-auto mb-3">
            IM
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Inventory Management</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">ENTERPRISE INVENTORY PLATFORM</p>
        </div>

        {/* Demo Fast-Switch Ribbon */}
        <div className="bg-slate-50 px-8 py-3.5 border-b border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-2 text-center font-mono">
            Demo Credentials Quick-Access
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoSignIn('SUPER_ADMIN')}
              disabled={loading}
              className="px-2 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-md text-center text-xs font-semibold text-slate-700 shadow-2xs transition"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleDemoSignIn('ADMIN')}
              disabled={loading}
              className="px-2 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-md text-center text-xs font-semibold text-slate-700 shadow-2xs transition"
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => handleDemoSignIn('STAFF')}
              disabled={loading}
              className="px-2 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-md text-center text-xs font-semibold text-slate-700 shadow-2xs transition"
            >
              Warehouse
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-8 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Google Login */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-md shadow-2xs flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2 text-[10px] uppercase font-mono text-slate-400 absolute">or email credentials</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

          {isSignup && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Rachel Adams"
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-2xs flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : isSignup ? 'Create Account' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition"
            >
              {isSignup
                ? 'Already have an account? Sign In'
                : "Don't have an account yet? Register here"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}
