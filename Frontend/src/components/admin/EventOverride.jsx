import React from 'react';
import { Link } from 'react-router-dom';
import useEventOverride from '../../hooks/admin/useEventOverride.js';
import { formatAdminDate } from '../../utils/adminFormatting.js';
import AdminRecommendations from './AdminRecommendations.jsx';

const statusMod = (s) => s === 'Planned' ? 'green' : s === 'Happened' ? 'blue' : 'red';

export default function EventOverride({ token }) {
    const {
        filtered, loading, search, setSearch, feedback, handleCancel,
        recommendations, showRecommendations, setShowRecommendations
    } = useEventOverride(token);

    const applyRecommendation = (value) => {
        setSearch(value);
        setShowRecommendations(false);
    };

    if (loading) return <p className="admin-empty">Loading events…</p>;

    return (
        <>
            {feedback._g && (
                <p className="admin-feedback admin-feedback--err">{feedback._g}</p>
            )}
            <div className="admin-controls">
                <div className="admin-search-wrap">
                    <input
                        className="admin-search admin-search--events"
                        placeholder="Search by title or host…"
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
            </div>
            <div className="admin-table-wrap admin-table-wrap--scroll">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Title</th><th>Host</th><th>Date</th>
                            <th>Status</th><th>Price</th><th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={6} className="admin-empty">No events found.</td></tr>
                        )}
                        {filtered.map(ev => (
                            <tr key={ev._id}>
                                <td><strong>{ev.title}</strong></td>
                                <td className="admin-muted">
                                    {ev.creator?.username ?? ev.host?.name ?? '—'}
                                </td>
                                <td className="admin-muted">{formatAdminDate(ev.datetime || ev.date)}</td>
                                <td>
                                    <span className={`admin-badge admin-badge--${statusMod(ev.status)}`}>
                                        {ev.status}
                                    </span>
                                </td>
                                <td>{ev.price === 0 ? 'Free' : `€${ev.price}`}</td>
                                <td>
                                    <div className="admin-action-row">
                                        <Link
                                            className="admin-btn admin-btn--outline admin-btn--sm"
                                            to={`/events/${ev._id}/edit`}>
                                            Edit
                                        </Link>
                                        {ev.status !== 'Cancelled' ? (
                                            <button
                                                className={`admin-btn admin-btn--sm ${ev.status === 'Happened' ? 'admin-btn--muted' : 'admin-btn--danger'}`}
                                                disabled={ev.status === 'Happened'}
                                                onClick={() => handleCancel(ev)}>
                                                Cancel
                                            </button>
                                        ) : (
                                            <span className="admin-muted">—</span>
                                        )}
                                    </div>
                                    {feedback[ev._id] && (
                                        <p className={`admin-feedback admin-feedback--sm ${feedback[ev._id].ok ? 'admin-feedback--ok' : 'admin-feedback--err'}`}>
                                            {feedback[ev._id].msg}
                                        </p>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
