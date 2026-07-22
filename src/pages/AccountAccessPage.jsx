import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useHomeOps } from "../context/HomeOpsContext";
import { deleteHome, money } from "../lib/homeopsApi";
import AccountSettingsModal from "../components/AccountSettingsModal";
import Modal from "../components/Modal";
import HomeOpsLoadingSkeleton from "../components/HomeOpsLoadingSkeleton";

function TrashIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16" />
            <path d="M9 7V4h6v3" />
            <path d="m7 7 1 13h8l1-13" />
            <path d="M10 11v5M14 11v5" />
        </svg>
    );
}

export default function AccountAccessPage({ goToPage }) {
    const { user, logout } = useAuth();
    const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const {
        homes,
        selectedHome,
        homeId,
        chooseHome,
        loadingHomes,
        homesError,
        reloadHomes,
        openPropertySetup,
    } = useHomeOps();

    function handleChooseProperty(propertyId) {
        chooseHome(propertyId);
        goToPage?.("dashboard");
    }

    function requestPropertyRemoval(property) {
        setDeleteError("");
        setDeleteTarget(property);
    }

    function closeRemovalModal() {
        if (deleting) return;

        setDeleteError("");
        setDeleteTarget(null);
    }

    async function confirmPropertyRemoval() {
        if (!deleteTarget?.id || deleting) return;

        const removedId = String(deleteTarget.id);
        const wasActive = removedId === String(homeId);
        const remainingProperties = homes.filter((property) => String(property.id) !== removedId);
        const nextPropertyId = wasActive
            ? remainingProperties[0]?.id
            : (selectedHome?.id || remainingProperties[0]?.id);

        setDeleting(true);
        setDeleteError("");

        try {
            await deleteHome(deleteTarget.id);
            setDeleteTarget(null);

            if (nextPropertyId) {
                chooseHome(nextPropertyId);
                await reloadHomes(nextPropertyId);
            } else {
                await reloadHomes();
            }
        } catch (error) {
            setDeleteError(error.message || "Could not remove this property.");
        } finally {
            setDeleting(false);
        }
    }

    const deleteTargetIsOwner = deleteTarget?.access_role === "owner";
    const removalTitle = deleteTargetIsOwner ? "Delete property?" : "Remove property access?";
    const removalIntro = deleteTargetIsOwner
        ? "This permanently removes the property and everything attached to it."
        : "This removes the property from your account. The owner's records stay intact.";

    return (
        <>
            <header className="page-header">
                <div>
                    <h1>Account & Access</h1>
                    <p>Manage your sign-in, properties, and who can access each property.</p>
                </div>
                <div className="page-actions">
                    <button className="ghost-action" type="button" onClick={() => reloadHomes()}>Refresh access</button>
                    <button className="page-primary-action" type="button" onClick={openPropertySetup}>+ Property</button>
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
                    <button className="page-primary-action page-primary-action--compact page-primary-action--icon" type="button" onClick={openPropertySetup} aria-label="Add property" title="Add property">+</button>
                </div>

                {homesError && <div className="form-error">{homesError}</div>}

                {loadingHomes && <HomeOpsLoadingSkeleton rows={3} label="Loading property access" />}

                {!loadingHomes && homes.length === 0 && (
                    <div className="empty-box account-access-empty">
                        <strong>No properties attached yet.</strong>
                        <p>This is why you are seeing “Create your first property.” Create one property anchor first, then the rest of HomeOps can attach records correctly.</p>
                        <button className="primary-action" type="button" onClick={openPropertySetup}>Set up first property</button>
                    </div>
                )}

                {!loadingHomes && homes.length > 0 && (
                    <div className="account-access-list">
                        {homes.map((property) => {
                            const isActive = String(property.id) === String(homeId);
                            const isOwner = property.access_role === "owner";
                            const removalLabel = isOwner ? `Delete ${property.name}` : `Remove access to ${property.name}`;

                            return (
                                <article
                                    key={property.id}
                                    className={`account-access-property ${isActive ? "is-active" : ""}`}
                                >
                                    <button
                                        className="account-access-property__select"
                                        type="button"
                                        onClick={() => handleChooseProperty(property.id)}
                                        aria-current={isActive ? "true" : undefined}
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
                                    <button
                                        className="account-access-property__remove"
                                        type="button"
                                        onClick={() => requestPropertyRemoval(property)}
                                        aria-label={removalLabel}
                                        title={removalLabel}
                                    >
                                        <TrashIcon />
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <AccountSettingsModal
                active={accountSettingsOpen}
                onClose={() => setAccountSettingsOpen(false)}
            />

            <Modal
                active={Boolean(deleteTarget)}
                onClose={closeRemovalModal}
                title={removalTitle}
                intro={removalIntro}
                size="compact"
            >
                <div className="bill-action-confirmation">
                    <div className="bill-action-summary">
                        <span>{deleteTarget?.name || "Selected property"}</span>
                        <small>
                            {deleteTargetIsOwner
                                ? "Bills, receipts, documents, maintenance, rooms, assets, and history will be deleted. This cannot be undone."
                                : "Only your access is removed. This cannot be undone from your account."}
                        </small>
                    </div>

                    {deleteError && <div className="form-error">{deleteError}</div>}

                    <div className="bill-action-modal__actions">
                        <button
                            className="bill-action-button bill-action-button--secondary"
                            type="button"
                            onClick={closeRemovalModal}
                            disabled={deleting}
                        >
                            Cancel
                        </button>
                        <button
                            className="bill-action-button bill-action-button--danger"
                            type="button"
                            onClick={confirmPropertyRemoval}
                            disabled={deleting}
                        >
                            {deleting
                                ? "Removing..."
                                : (deleteTargetIsOwner ? "Delete property" : "Remove access")}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
