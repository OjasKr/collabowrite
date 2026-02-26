import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../lib/api";
import { DashboardSidebar } from "../components/DashboardSidebar";
import { DashboardHeader } from "../components/DashboardHeader";

export const Profile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileSaving(true);
    try {
      const { data } = await authApi.updateProfile({ name: name.trim() || undefined, bio: bio.trim() || undefined });
      if (data.user) {
        setUser(data.user);
        setProfileMessage({ type: "success", text: "Profile updated." });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setProfileMessage({ type: "error", text: msg || "Failed to update profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    setPasswordSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordMessage({ type: "success", text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPasswordMessage({ type: "error", text: msg || "Failed to change password." });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display antialiased text-slate-900 dark:text-slate-100">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform md:relative md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <DashboardSidebar
          onNewDocumentClick={() => {
            setMobileMenuOpen(false);
            navigate("/");
          }}
          onMobileMenuClose={() => setMobileMenuOpen(false)}
        />
      </div>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader onMenuClick={() => setMobileMenuOpen(true)} />
        <div className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
          <div className="max-w-2xl mx-auto flex flex-col gap-10">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Account</h1>

            {/* Profile: name & bio */}
            <section className="rounded-2xl border border-slate-200 dark:border-surface-highlight bg-white dark:bg-surface-dark p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Profile</h2>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {profileMessage && (
                  <p
                    className={`text-sm p-2 rounded-xl ${
                      profileMessage.type === "success"
                        ? "text-green-700 dark:text-green-400 bg-green-500/10"
                        : "text-red-400 bg-red-500/10"
                    }`}
                  >
                    {profileMessage.text}
                  </p>
                )}
                <div>
                  <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="profile-bio" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    id="profile-bio"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A short bio..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors disabled:opacity-70"
                >
                  {profileSaving ? "Saving..." : "Save profile"}
                </button>
              </form>
            </section>

            {/* Security: change password */}
            <section className="rounded-2xl border border-slate-200 dark:border-surface-highlight bg-white dark:bg-surface-dark p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Security</h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {passwordMessage && (
                  <p
                    className={`text-sm p-2 rounded-xl ${
                      passwordMessage.type === "success"
                        ? "text-green-700 dark:text-green-400 bg-green-500/10"
                        : "text-red-400 bg-red-500/10"
                    }`}
                  >
                    {passwordMessage.text}
                  </p>
                )}
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Current password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">At least 8 characters.</p>
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors disabled:opacity-70"
                >
                  {passwordSaving ? "Updating..." : "Change password"}
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
