import { useState } from "react";
import homeOpsLogo from "../assets/brand/homeops-logo-horizontal-master-transparent.png";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
    const { login, loading, error } = useAuth();
    const [email, setEmail] = useState(import.meta.env.VITE_HOMEOPS_LOGIN_EMAIL || "");
    const [password, setPassword] = useState("");
    const [localError, setLocalError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setLocalError("");

        const trimmedEmail = email.trim();

        if (!trimmedEmail || !password) {
            setLocalError("Enter your email and password to continue.");
            return;
        }

        try {
            await login({
                email: trimmedEmail,
                password,
                remember: true,
            });
        } catch (err) {
            setLocalError(err.message || "Could not log in.");
        }
    }

    return (
        <main className="homeops-login-page">
            <section className="homeops-login-card panel" aria-labelledby="homeops-login-title">
                <div className="homeops-login-card__brand">
                    <img src={homeOpsLogo} alt="HomeOps" className="homeops-login-card__logo" />
                </div>

                <div className="homeops-login-card__intro">
                    <p className="eyebrow">Private Owner Mode</p>
                    <h1 id="homeops-login-title">Sign in to HomeOps</h1>
                    <p>Sign in to access your properties, bills, maintenance, receipts, and dashboard.</p>
                </div>

                <form onSubmit={handleSubmit} className="homeops-login-form">
                    <label>
                        <span>Email</span>
                        <input
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </label>

                    <label>
                        <span>Password</span>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                    </label>

                    {(localError || error) && <div className="form-error">{localError || error}</div>}

                    <button type="submit" className="primary-action" disabled={loading}>
                        {loading ? "Signing in…" : "Sign In"}
                    </button>
                </form>
            </section>
        </main>
    );
}
