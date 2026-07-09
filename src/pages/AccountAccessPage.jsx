import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useHomeOps } from "../context/HomeOpsContext";
import { money } from "../lib/homeopsApi";
import AccountSettingsModal from "../components/AccountSettingsModal";

export default function AccountAccessPage({ goToPage }) {
    const { user, logout } = useAuth();
    const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
    const { homes, selectedHome, homeId, chooseHome, loadingHomes, homesError, reloadHomes } = useHomeOps();

    function handleChooseProperty(propertyId) {
        chooseHome(propertyId);
        goToPage?.("dashboard");
    }

    return (
        <>
            <header className="page-header">
                <div>
                    <h1>Account & Access</h1>
                    <p>V1 foundation is active: login is required, properties are scoped, and HomeOps is ready for owner/editor/viewer roles.</p>
                </div>
                <div className="page-actions">
                    <button className="ghost-action" type="button" onClick={() => reloadHomes()}>Refresh access</button>
                    <button className="primary-action" type="button" onClick={() => goToPage?.("home")}>Create / edit property</button>
                </div>
            </header>

            <section className="account-access-grid">
                <article className="panel account-access-card">
                    <span className="v0-eyebrow">Signed in as</span>
                    <strong>{user?.name || "HomeOps user"}</strong>
                    <p>{user?.email}</p>
                    <div className="account-access-card__actions">
                        <button className="ghost-action" type="button" onClick={() => setAccountSettingsOpen(true)}>Account settings</button>
                        <button className="ghost-action" type="button" onClick={logout}>Logout</button>
                    </div>
                </article>

                <article className="panel account-access-card">
                    <span className="v0-eyebrow">Current property</span>
                    <strong>{selectedHome?.name || "No property selected"}</strong>
                    <p>{selectedHome ? `${selectedHome.property_type || "property"} · ${selectedHome.city_region || "location TBD"}` : "Create your first property in the Property Profile."}</p>
                    <button className="ghost-action" type="button" onClick={() => goToPage?.("home")}>{selectedHome ? "Edit property" : "Create property"}</button>
                </article>
            </section>

            <section className="panel account-access-properties">
                <div className="account-access-properties__head">
                    <div>
                        <span className="v0-eyebrow">Your properties</span>
                        <h2>Property access</h2>
                        <p>These are the homes this account can load. Bills, receipts, maintenance, periods, and dashboard data should stay scoped to the selected property.</p>
                    </div>
                </div>

                {homesError && <div className="form-error">{homesError}</div>}

                {loadingHomes && <div className="empty-box">Loading property access…</div>}

                {!loadingHomes && homes.length === 0 && (
                    <div className="empty-box account-access-empty">
                        <strong>No properties attached yet.</strong>
                        <p>This is why you are seeing “Create your first property.” Create one property anchor first, then the rest of HomeOps can attach records correctly.</p>
                        <button className="primary-action" type="button" onClick={() => goToPage?.("home")}>Create first property</button>
                    </div>
                )}

                {!loadingHomes && homes.length > 0 && (
                    <div className="account-access-list">
                        {homes.map((property) => {
                            const isActive = String(property.id) === String(homeId);
                            return (
                                <button
                                    key={property.id}
                                    className={`account-access-property ${isActive ? "is-active" : ""}`}
                                    type="button"
                                    onClick={() => handleChooseProperty(property.id)}
                                >
                                    <span>
                                        <strong>{property.name}</strong>
                                        <small>{property.property_type || "property"} · {property.city_region || "location TBD"}</small>
                                    </span>
                                    <span>
                                        <b>{money(property.baseline_monthly_cost || 0)}/mo</b>
                                        <small>{property.access_role ? `${property.access_role}${property.is_primary ? " · Primary" : ""}` : (property.is_primary ? "Primary" : "Property")}</small>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>
            <AccountSettingsModal
                active={accountSettingsOpen}
                onClose={() => setAccountSettingsOpen(false)}
            />
        </>
    );
}
