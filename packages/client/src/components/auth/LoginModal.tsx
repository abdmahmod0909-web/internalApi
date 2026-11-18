import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { LogIn, Server, Eye, EyeOff, ShieldCheck, AlertCircle, X, CheckCircle2 } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    setLoginModalOpen,
    serverUrl,
    loginAction,
  } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customServerUrl, setCustomServerUrl] = useState(serverUrl || '');
  const [showServerConfig, setShowServerConfig] = useState(Boolean(serverUrl));
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginAction(
        email,
        password,
        showServerConfig ? customServerUrl : undefined
      );

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setLoginModalOpen(false);
        }, 600);
      } else {
        setError(res.error || 'Failed to authenticate');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <LogIn className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Sign In to InternalAPI</h2>
              <p className="text-xs text-gray-400">Connect to your team workspace</p>
            </div>
          </div>
          <button
            onClick={() => setLoginModalOpen(false)}
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Authentication successful! Connecting...</span>
            </div>
          )}

          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-300">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              required
              className="w-full px-3 py-2 text-xs bg-gray-950 border border-gray-800 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Password input with Eye toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-300">Password</label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3 py-2 pr-9 text-xs bg-gray-950 border border-gray-800 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-200 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Server URL Config (Optional / Advanced) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="flex items-center space-x-1.5 text-[11px] text-gray-400 hover:text-orange-400 transition-colors"
            >
              <Server className="w-3 h-3" />
              <span>{showServerConfig ? 'Hide Server URL' : 'Configure Remote Server URL (Cloud Sync)'}</span>
            </button>

            {showServerConfig && (
              <div className="mt-2 p-3 bg-gray-950/80 border border-gray-800 rounded-md space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">Server Host URL</span>
                  <span className="text-[10px] text-gray-500">Leave blank for local desktop server</span>
                </div>
                <input
                  type="text"
                  value={customServerUrl}
                  onChange={(e) => setCustomServerUrl(e.target.value)}
                  placeholder="e.g. https://api.mycompany.com or http://192.168.1.100:3001"
                  className="w-full px-2.5 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2 px-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold rounded-md shadow transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </>
            )}
          </button>

          {/* Registration Notice */}
          <div className="pt-2 border-t border-gray-800/80 flex items-start space-x-2 text-[11px] text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
            <span>
              Self-registration is disabled. User accounts are created exclusively by your workspace Administrator.
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};
