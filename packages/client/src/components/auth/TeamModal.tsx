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
  Search,
  Lock,
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
    adminResetPasswordAction,
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
  const [searchQuery, setSearchQuery] = useState('');

  // Password reset state for a specific user
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUserEmail, setResetUserEmail] = useState<string>('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (isTeamModalOpen && currentUser?.role === 'admin') {
      fetchTeamUsersAction();
    }
  }, [isTeamModalOpen, currentUser]);

  if (!isTeamModalOpen) return null;

  // Enforce admin-only access
  if (currentUser?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Administrator Access Required</h3>
            <p className="text-xs text-gray-400 mt-1">
              User management is restricted exclusively to administrators. Your current role is <span className="font-semibold text-gray-200 uppercase">{currentUser?.role || 'Guest'}</span>.
            </p>
          </div>
          <button
            onClick={() => setTeamModalOpen(false)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

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
    if (!confirm(`Are you sure you want to permanently delete user "${userEmail}"?`)) return;
    setError(null);
    setSuccess(null);
    const res = await deleteTeamUserAction(id);
    if (res.success) {
      setSuccess(`User "${userEmail}" deleted successfully.`);
    } else {
      setError(res.error || 'Failed to delete user');
    }
  };

  const openResetDialog = (userId: string, userEmail: string) => {
    setResetUserId(userId);
    setResetUserEmail(userEmail);
    setResetNewPassword('');
    setShowResetPassword(false);
    setError(null);
    setSuccess(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId) return;
    if (resetNewPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    setIsResetting(true);
    setError(null);
    setSuccess(null);

    const res = await adminResetPasswordAction(resetUserId, resetNewPassword);
    setIsResetting(false);

    if (res.success) {
      setSuccess(`Password for "${resetUserEmail}" reset successfully!`);
      setResetUserId(null);
      setResetNewPassword('');
    } else {
      setError(res.error || 'Failed to reset password');
    }
  };

  const filteredUsers = teamUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/70 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-white">User Management</h2>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono font-medium">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-gray-400">View team members, reset passwords, create, or delete accounts</p>
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

          {/* Reset Password Dialog (Inline overlay) */}
          {resetUserId && (
            <div className="p-4 bg-gray-950 border border-indigo-500/40 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400">
                  <Key className="w-4 h-4" />
                  <span>Admin Password Reset for: <strong className="text-white font-mono">{resetUserEmail}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setResetUserId(null)}
                  className="text-gray-500 hover:text-gray-300 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Enter New Password for User</label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      autoFocus
                      className="w-full px-3 py-2 pr-9 text-xs bg-gray-900 border border-gray-800 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-300"
                    >
                      {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setResetUserId(null)}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || resetNewPassword.length < 6}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center space-x-1.5"
                  >
                    {isResetting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5" />
                        <span>Confirm Reset Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Action bar: Search + Add user toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name, email, or role..."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              onClick={() => setIsAddFormOpen(!isAddFormOpen)}
              className="flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-lg shadow transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isAddFormOpen ? 'Close Form' : 'Add New User'}</span>
            </button>
          </div>

          {/* Add User Collapsible Form */}
          {isAddFormOpen && (
            <form onSubmit={handleCreate} className="p-4 bg-gray-950/80 border border-orange-500/30 rounded-xl space-y-3.5 animate-in slide-in-from-top-2 duration-150">
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
                    <option value="admin">Admin (Full access + manage users)</option>
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
          <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-950/40">
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
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No users match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
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
                          <div className="flex items-center justify-end space-x-1">
                            {/* Reset Password Button */}
                            <button
                              onClick={() => openResetDialog(user.id, user.email)}
                              className="px-2 py-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded transition-colors flex items-center space-x-1"
                              title="Reset this user's password"
                            >
                              <Key className="w-3 h-3" />
                              <span className="hidden sm:inline">Reset Pwd</span>
                            </button>

                            {/* Delete User Button (Disabled for self) */}
                            {!isSelf && (
                              <button
                                onClick={() => handleDelete(user.id, user.email)}
                                className="p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                title="Delete user account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
