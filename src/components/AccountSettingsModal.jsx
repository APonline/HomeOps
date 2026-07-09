/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";

const emptyPasswordForm = {
    current_password: "",
    password: "",
    password_confirmation: "",
};

export default function AccountSettingsModal({ active, onClose }) {
    const { user, updateProfile, updatePassword } = useAuth();
    const [profileForm, setProfileForm] = useState({ name: "", email: "" });
    const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [profileMessage, setProfileMessage] = useState("");
    const [passwordMessage, setPasswordMessage] = useState("");
    const [profileError, setProfileError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    useEffect(() => {
        if (!active) return;

        setProfileForm({
            name: user?.name || "",
            email: user?.email || "",
        });
        setPasswordForm(emptyPasswordForm);
        setProfileMessage("");
        setPasswordMessage("");
        setProfileError("");
        setPasswordError("");
    }, [active, user?.email, user?.name]);

    async function handleProfileSubmit(event) {
        event.preventDefault();
        setSavingProfile(true);
        setProfileMessage("");
        setProfileError("");

        try {
            await updateProfile(profileForm);
            setProfileMessage("Account profile updated.");
        } catch (error) {
            setProfileError(error.message || "Could not update your profile.");
        } finally {
            setSavingProfile(false);
        }
    }

    async function handlePasswordSubmit(event) {
        event.preventDefault();
        setSavingPassword(true);
        setPasswordMessage("");
        setPasswordError("");

        try {
            await updatePassword(passwordForm);
            setPasswordForm(emptyPasswordForm);
            setPasswordMessage("Password updated.");
        } catch (error) {
            setPasswordError(error.message || "Could not update your password.");
        } finally {
            setSavingPassword(false);
        }
    }

    return (
        <Modal
            active={active}
            onClose={onClose}
            title="Account settings"
            intro="Keep this lightweight. Your profile and password live here without turning Account & Access into another heavy section."
            size="wide"
        >
            <div className="account-settings-modal">
                <form className="account-settings-panel" onSubmit={handleProfileSubmit}>
                    <div className="account-settings-panel__head">
                        <span className="v0-eyebrow">Profile</span>
                        <h3>Your HomeOps identity</h3>
                        <p>This is the account attached to your property access.</p>
                    </div>

                    <div className="form-grid two-columns">
                        <label>
                            <span>Name</span>
                            <input
                                value={profileForm.name}
                                onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                                placeholder="Your name"
                                autoComplete="name"
                            />
                        </label>
                        <label>
                            <span>Email</span>
                            <input
                                type="email"
                                value={profileForm.email}
                                onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                                placeholder="you@example.com"
                                autoComplete="email"
                            />
                        </label>
                    </div>

                    {profileError && <div className="form-error">{profileError}</div>}
                    {profileMessage && <div className="form-success">{profileMessage}</div>}

                    <div className="account-settings-actions">
                        <button className="primary-action" type="submit" disabled={savingProfile}>
                            {savingProfile ? "Saving…" : "Save profile"}
                        </button>
                    </div>
                </form>

                <form className="account-settings-panel" onSubmit={handlePasswordSubmit}>
                    <div className="account-settings-panel__head">
                        <span className="v0-eyebrow">Security</span>
                        <h3>Change password</h3>
                        <p>Use a strong password because this account protects real property records.</p>
                    </div>

                    <div className="form-grid">
                        <label>
                            <span>Current password</span>
                            <input
                                type="password"
                                value={passwordForm.current_password}
                                onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))}
                                autoComplete="current-password"
                            />
                        </label>
                    </div>

                    <div className="form-grid two-columns">
                        <label>
                            <span>New password</span>
                            <input
                                type="password"
                                value={passwordForm.password}
                                onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
                                autoComplete="new-password"
                            />
                        </label>
                        <label>
                            <span>Confirm new password</span>
                            <input
                                type="password"
                                value={passwordForm.password_confirmation}
                                onChange={(event) => setPasswordForm((current) => ({ ...current, password_confirmation: event.target.value }))}
                                autoComplete="new-password"
                            />
                        </label>
                    </div>

                    {passwordError && <div className="form-error">{passwordError}</div>}
                    {passwordMessage && <div className="form-success">{passwordMessage}</div>}

                    <div className="account-settings-actions">
                        <button className="primary-action" type="submit" disabled={savingPassword}>
                            {savingPassword ? "Updating…" : "Update password"}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
