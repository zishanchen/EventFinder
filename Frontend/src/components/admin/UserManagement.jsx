import React from 'react';
import useUserManagement from '../../hooks/admin/useUserManagement.js';
import { formatAdminDate } from '../../utils/adminFormatting.js';
import AdminIcon from './AdminIcon.jsx';
import AdminRecommendations from './AdminRecommendations.jsx';

const verifiedLabel = (u) => {
    if (u.gdprDeletedAt) return '—';
    if (u.role === 'Host') return u.verified ? 'Verified' : 'Pending';
    if (u.role === 'Participant') return u.isVerified ? 'Verified' : 'Unverified';
    return '—';
};

const verifiedIcon = (label) => {
    if (label === 'Verified') return 'checkCircle';
    if (label === 'Pending') return 'clock';
    if (label === 'Unverified') return 'mail';
    return null;
};

const verifiedBadgeClass = (label) => {
    if (label === 'Verified') return 'admin-badge--green';
    if (label === 'Pending') return 'admin-badge--amber';
    if (label === 'Unverified') return 'admin-badge--blue';
    return 'admin-badge--bill-default';
};

export default function UserManagement({ token }) {
    const {
        filtered, loading, search, setSearch,
        roleFilter, setRoleFilter, feedback,
        gdprTarget, setGdprTarget, handleDeactivate, handleGdprDelete,
        recommendations, showRecommendations, setShowRecommendations
    } = useUserManagement(token);

    const applyRecommendation = (value) => {
        setSearch(value);
        setShowRecommendations(false);
    };

    return (
        <>
            {feedback._g && (
                <p className="admin-feedback admin-feedback--err">{feedback._g}</p>
            )}

            <div className="admin-controls">
                <div className="admin-search-wrap">
                    <input
                        className="admin-search admin-search--users"
                        placeholder="Search by name or email…"
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value);
                            setShowRecommendations(true);
                        }}
                        onFocus={() => setShowRecommendations(true)}
                        onBlur={() => setShowRecommendations(false)}
                    />
                    {showRecommendations && recommendations.length > 0 && (
                        <AdminRecommendations
                            className="admin-search__recommendations"
                            items={recommendations}
                            onSelect={applyRecommendation}
                        />
                    )}
                </div>
                <div className="admin-role-tabs">
                    {['All', 'Participant', 'Host'].map(r => (
                        <button key={r}
                            className={`admin-role-tab ${roleFilter === r ? 'admin-role-tab--active' : ''}`}
                            onClick={() => {
                                setRoleFilter(r);
                                setShowRecommendations(false);
                            }}>
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <p className="admin-empty">Loading users…</p>
            ) : (
                <div className="admin-table-wrap admin-table-wrap--scroll">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Username</th><th>Email</th><th>Role</th>
                                <th>Status</th><th>Verified</th><th>Joined</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} className="admin-empty">No users found.</td></tr>
                            )}
                            {filtered.map(u => (
                                <tr key={u._id} className={!u.active || u.gdprDeletedAt ? 'admin-table__row--inactive' : ''}>
                                    <td><strong>{u.username}</strong></td>
                                    <td className="admin-muted">{u.email}</td>
                                    <td>
                                        <span className={`admin-badge admin-badge--${u.role === 'Host' ? 'violet' : 'blue'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${u.active && !u.gdprDeletedAt ? 'admin-badge--green' : 'admin-badge--red'}`}>
                                            {u.gdprDeletedAt ? 'GDPR Deleted' : u.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        {(() => {
                                            const label = verifiedLabel(u);
                                            const icon = verifiedIcon(label);

                                            return (
                                                <span className={`admin-badge admin-badge--with-icon ${verifiedBadgeClass(label)}`}>
                                                    {icon && <AdminIcon name={icon} />}
                                                    {label}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="admin-muted">{formatAdminDate(u.createdAt)}</td>
                                    <td>
                                        <div className="admin-action-row">
                                            <button
                                                className={`admin-btn admin-btn--sm ${u.active ? 'admin-btn--muted' : 'admin-btn--approve'}`}
                                                disabled={Boolean(u.gdprDeletedAt)}
                                                onClick={() => handleDeactivate(u)}>
                                                {u.active ? 'Deactivate' : 'Reactivate'}
                                            </button>
                                            <button
                                                className="admin-btn admin-btn--sm admin-btn--danger"
                                                disabled={Boolean(u.gdprDeletedAt)}
                                                onClick={() => setGdprTarget(u)}>
                                                GDPR Delete
                                            </button>
                                        </div>
                                        {feedback[u._id] && (
                                            <p className={`admin-feedback admin-feedback--sm ${feedback[u._id].ok ? 'admin-feedback--ok' : 'admin-feedback--err'}`}>
                                                {feedback[u._id].msg}
                                            </p>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* GDPR Confirm Modal */}
            {gdprTarget && (
                <div className="admin-modal-overlay" onClick={() => setGdprTarget(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <h3 className="admin-modal__title">
                            <span className="admin-modal__title-icon"><AdminIcon name="alert" /></span>
                            GDPR Deletion Request
                        </h3>
                        <p className="admin-modal__body">
                            You are about to anonymise all personal data for:
                        </p>
                        <div className="admin-modal__target">
                            <strong>{gdprTarget.username}</strong>
                            <span>{gdprTarget.email}</span>
                            <span className={`admin-badge admin-badge--${gdprTarget.role === 'Host' ? 'violet' : 'blue'}`}>
                                {gdprTarget.role}
                            </span>
                        </div>
                        <ul className="admin-modal__rules">
                            <li>Account anonymised and deactivated</li>
                            <li>Ratings given: rater reference removed (values kept)</li>
                            <li>Ratings received: permanently deleted</li>
                            <li>Attended registrations: anonymised</li>
                            <li>Other registrations: deleted</li>
                            {gdprTarget.role === 'Host' && (
                                <li>Past events: anonymised (blocked if active registrations exist)</li>
                            )}
                        </ul>
                        <p className="admin-modal__warn">This action cannot be undone.</p>
                        <div className="admin-modal__actions">
                            <button className="admin-btn admin-btn--outline"
                                onClick={() => setGdprTarget(null)}>
                                Cancel
                            </button>
                            <button className="admin-btn admin-btn--danger"
                                onClick={handleGdprDelete}>
                                Confirm GDPR Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
