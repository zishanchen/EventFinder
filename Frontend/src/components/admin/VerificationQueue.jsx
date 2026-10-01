import React from 'react';
import useHostVerification from '../../hooks/admin/useHostVerification.js';
import { formatAdminDate } from '../../utils/adminFormatting.js';
import AdminIcon from './AdminIcon.jsx';

export default function VerificationQueue({ token }) {
    const {
        hosts, loading, tokenInputs, feedback,
        setTokenInput, handleVerify, handleReject
    } = useHostVerification(token);

    if (loading) return <p className="admin-empty">Loading verification queue…</p>;
    if (feedback._g) return <p className="admin-feedback admin-feedback--err">{feedback._g}</p>;
    if (hosts.length === 0) {
        return (
            <p className="admin-empty admin-empty--icon">
                <span className="admin-empty__icon"><AdminIcon name="checkCircle" /></span>
                No pending hosts - queue is clear.
            </p>
        );
    }

    return (
        <div className="admin-queue">
            {hosts.map(host => (
                <div key={host._id} className="admin-queue__item">
                    <div className="admin-queue__info">
                        <strong>{host.username}</strong>
                        <span className="admin-queue__email">{host.email}</span>
                        <span className="admin-queue__meta">
                            {host.socialMedia?.platform} · @{host.socialMedia?.username}
                        </span>
                        <span className="admin-queue__meta">Registered: {formatAdminDate(host.createdAt)}</span>
                    </div>
                    <div className="admin-queue__actions">
                        <input
                            className="admin-input"
                            placeholder="Paste token received via DM…"
                            value={tokenInputs[host._id] ?? ''}
                            onChange={e => setTokenInput(host._id, e.target.value)}
                        />
                        <div className="admin-queue__btns">
                            <button className="admin-btn admin-btn--approve"
                                onClick={() => handleVerify(host)}>
                                Verify
                            </button>
                            <button className="admin-btn admin-btn--danger"
                                onClick={() => handleReject(host)}>
                                Reject
                            </button>
                        </div>
                        {feedback[host._id] && (
                            <p className={`admin-feedback ${feedback[host._id].ok ? 'admin-feedback--ok' : 'admin-feedback--err'}`}>
                                {feedback[host._id].msg}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
