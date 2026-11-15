import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  User as UserIcon,
  X,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
} from 'lucide-react';
import type { UserRole } from '@internalapi/shared';

export const TeamModal: React.FC = () => {
  const {
    isTeamModalOpen,
    setTeamModalOpen,
    currentUser,
    teamUsers,
    fetchTeamUsersAction,
    createTeamUserAction,
    deleteTeamUserAction,
  } = useAppStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('editor');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  useEffect(() => {
    if (isTeamModalOpen) {
      fetchTeamUsersAction();
    }
  }, [isTeamModalOpen]);

  if (!isTeamModalOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await createTeamUserAction({
        name,
        email,
        password,
        role,
      });

      if (res.success) {
        setSuccess(`User account "${email}" created successfully!`);
        setName('');
        setEmail('');
        setPassword('');
        setIsAddFormOpen(false);
      } else {
        setError(res.error || 'Failed to create user account');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove user "${userEmail}"?`)) return;
    setError(null);
    setSuccess(null);
    const res = await deleteTeamUserAction(id);
    if (res.success) {
      setSuccess(`User "${userEmail}" removed.`);
    } else {
      setError(res.error || 'Failed to delete user');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Team Accounts & Access</h2>
              <p className="text-xs text-gray-400">Manage user accounts and team access permissions</p>
            </div>
          </div>
          <button
            onClick={() => setTeamModalOpen(false)}
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Action bar: Add user toggle */}
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-300">
              Active Team Members ({teamUsers.length})
            </div>
            <button
              onClick={() => setIsAddFormOpen(!isAddFormOpen)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-md shadow transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddFormOpen ? 'Close Form' : 'Add Team Member'}</span>
            </button>
          </div>

          {/* Add Team Member Collapsible Form */}
          {isAddFormOpen && (
            <form onSubmit={handleCreate} className="p-4 bg-gray-950/80 border border-orange-500/30 rounded-lg space-y-3.5 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center space-x-2 text-xs font-semibold text-orange-400">
                <UserPlus className="w-4 h-4" />
                <span>Create New User Account</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. sarah@company.com"
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Initial Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      className="w-full px-2.5 py-1.5 pr-8 text-xs bg-gray-900 border border-gray-800 rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1.5 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Role & Permissions</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded text-gray-200 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="editor">Editor (Send requests, edit collections)</option>
                    <option value="admin">Admin (Full access + manage team accounts)</option>
                    <option value="viewer">Viewer (Read-only)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold rounded shadow transition-colors flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Members Table */}
          <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/80 text-[11px] font-medium text-gray-400">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {teamUsers.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  const initials = user.name
                    ? user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'U';

                  return (
                    <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-gray-200 flex items-center space-x-1.5">
                              <span>{user.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 text-[9px] bg-orange-500/20 text-orange-400 rounded-full font-mono">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            user.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {user.role === 'admin' ? (
                            <Shield className="w-2.5 h-2.5" />
                          ) : (
                            <UserIcon className="w-2.5 h-2.5" />
                          )}
                          <span>{user.role}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Active</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-gray-400 text-[11px]">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => handleDelete(user.id, user.email)}
                            className="p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                            title="Remove team member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
