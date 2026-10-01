import React, { useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import { useAuthContext } from '../context/AuthContext.jsx';
import StatsBar from '../components/admin/StatsBar.jsx';
import VerificationQueue from '../components/admin/VerificationQueue.jsx';
import EventOverride from '../components/admin/EventOverride.jsx';
import UserManagement from '../components/admin/UserManagement.jsx';
import PlatformSettings from '../components/admin/PlatformSettings.jsx';
import BillManagement from '../components/admin/BillManagement.jsx';
import AdminIcon from '../components/admin/AdminIcon.jsx';
import '../styles/admin.css';

const SECTIONS = [
    { id: 'stats', icon: 'activity', label: 'Platform Stats' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
    { id: 'users', icon: 'users', label: 'User Management' },
    { id: 'hosts', icon: 'shield', label: 'Host Verification' },
    { id: 'events', icon: 'calendar', label: 'Event Override' },
    { id: 'bills', icon: 'creditCard', label: 'Billable Participant Bills' },
];

const SECTION_META = {
    stats: { eyebrow: 'Overview', title: 'Platform Statistics', sub: 'Quick snapshot of users, events, registrations, ratings, and revenue.' },
    hosts: { eyebrow: 'Verification', title: 'Host Verification Queue', sub: 'Enter the token the host sent via DM and click Verify.' },
    events: { eyebrow: 'Event Management', title: 'Event Status Override', sub: 'Force-cancel an event if necessary. This action cannot be undone.' },
    users: { eyebrow: 'User Management', title: 'Users & GDPR', sub: 'Deactivate accounts or process GDPR Art. 17 deletion requests.' },
    bills: { eyebrow: 'Billing', title: 'Billable Participant Bills', sub: 'Search attended and late-cancelled participant bills by participant, host, email, or event, and manage relief when needed.' },
    settings: { eyebrow: 'Platform Settings', title: 'Cancellation, Tags & Boosts', sub: 'Manage cancellation timing, available tags, and boost types.' },
};

export default function AdminPanel() {
    const { token } = useAuthContext();
    const [active, setActive] = useState('stats');
    const meta = SECTION_META[active];

    return (
        <div className="admin-page">
            <Navbar />
            <div className="admin-body">
                <div className="admin-wrap">

                    {/* Page header */}
                    <div className="admin-header">
                        <div className="admin-header__top">
                            <span className="admin-header__avatar" aria-hidden="true">
                                <AdminIcon name="shield" />
                            </span>
                            <div className="admin-header__info">
                                <p className="admin-header__eyebrow">EventFinder</p>
                                <h1>Admin Panel</h1>
                                <p className="admin-header__subtitle">Track platform health, adjust settings, manage users and events, review bills, and verify hosts.</p>
                                <p className="admin-header__meta">Administrator workspace</p>
                            </div>
                        </div>
                    </div>

                    {/* Tab navigation */}
                    <div className="admin-tabs">
                        {SECTIONS.map(s => (
                            <button key={s.id}
                                className={`admin-tab ${active === s.id ? 'admin-tab--active' : ''}`}
                                onClick={() => setActive(s.id)}>
                                <span className="admin-tab__icon">
                                    <AdminIcon name={s.icon} />
                                </span>
                                <span>{s.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Section heading */}
                    <div className="admin-section-heading">
                        <div>
                            <p className="admin-header__eyebrow">{meta.eyebrow}</p>
                            <h2>{meta.title}</h2>
                            {meta.sub && (
                                <p>{meta.sub}</p>
                            )}
                        </div>
                    </div>

                    {/* Stats — no card wrapper */}
                    {active === 'stats' && <StatsBar token={token} />}

                    {/* Other sections — wrapped in a card */}
                    {active !== 'stats' && (
                        <div className="admin-section">
                            {active === 'hosts' && <VerificationQueue token={token} />}
                            {active === 'events' && <EventOverride token={token} />}
                            {active === 'users' && <UserManagement token={token} />}
                            {active === 'bills' && <BillManagement token={token} />}
                            {active === 'settings' && <PlatformSettings token={token} />}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
