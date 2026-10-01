import React from 'react';
import useAdminStats from '../../hooks/admin/useAdminStats.js';
import AdminIcon from './AdminIcon.jsx';

const fmt = (n) => (n ?? 0).toLocaleString('en-DE');
const EUR = (n) => new Intl.NumberFormat('en-DE', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(n ?? 0);

export default function StatsBar({ token }) {
    const { stats, loading, error } = useAdminStats(token);

    if (loading) return <p className="admin-empty">Loading statistics…</p>;
    if (error) return <p className="admin-feedback admin-feedback--err">{error}</p>;

    const cards = [
        { label: 'Verified Participants', value: fmt(stats.users.participants), icon: 'user', mod: 'blue' },
        { label: 'Verified Hosts', value: fmt(stats.users.hosts), icon: 'mic', mod: 'violet' },
        { label: 'Planned Events', value: fmt(stats.events.Planned), icon: 'clock', mod: 'green' },
        { label: 'Happened Events', value: fmt(stats.events.Happened), icon: 'checkCircle', mod: 'green' },
        { label: 'Registrations', value: fmt(stats.totalRegistrations), icon: 'clipboard', mod: 'blue' },
        { label: 'Ratings', value: fmt(stats.totalRatings), icon: 'star', mod: 'amber' },
        { label: 'Fee Earnings', value: EUR(stats.platformFeeEarnings), icon: 'creditCard', mod: 'amber' },
        { label: 'Boost Revenue', value: EUR(stats.boostRevenue), icon: 'rocket', mod: 'violet' },
    ];

    return (
        <div className="admin-stats">
            {cards.map(c => (
                <div key={c.label} className="admin-stat">
                    <span className={`admin-stat__icon admin-stat__icon--${c.mod}`}>
                        <AdminIcon name={c.icon} />
                    </span>
                    <div className="admin-stat__copy">
                        <strong className="admin-stat__value">{c.value}</strong>
                        <span className="admin-stat__label">{c.label}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
