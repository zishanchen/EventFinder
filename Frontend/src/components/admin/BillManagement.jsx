import React, { useEffect, useMemo, useState } from 'react';
import { fetchAdminBills, relieveAdminBill, restoreAdminBill } from '../../api/adminApi.js';
import { formatAdminDate, formatAdminMoney } from '../../utils/adminFormatting.js';
import AdminRecommendations from './AdminRecommendations.jsx';

const statusClass = (status) => {
    if (status === 'Pending') return 'admin-badge--bill-pending';
    if (status === 'Unpaid') return 'admin-badge--bill-unpaid';
    if (status === 'Paid') return 'admin-badge--bill-paid';
    if (status === 'Failed') return 'admin-badge--bill-failed';
    if (status === 'Relieved') return 'admin-badge--bill-relieved';
    if (status === 'Cancelled') return 'admin-badge--bill-cancelled';
    return 'admin-badge--bill-default';
};

const registrationStatusClass = (status) => {
    if (status === 'Attended') return 'admin-badge--registration-attended';
    if (status === 'CancelledLate') return 'admin-badge--registration-late';
    if (status === 'Cancelled' || status === 'Denied' || status === 'Removed') return 'admin-badge--registration-inactive';
    return 'admin-badge--registration-default';
};

const summaryLabel = (status) => {
    if (status === 'All') return 'matching bill(s)';
    return `${status.toLowerCase()} bill(s)`;
};

const registrationStatusOptions = [
    ['All', 'Either Attended or CancelledLate'],
    ['Attended', 'Attended'],
    ['CancelledLate', 'CancelledLate']
];

const invoiceStatusOptions = [
    ['All', 'All billable status'],
    ['Unpaid', 'Unpaid'],
    ['Paid', 'Paid'],
    ['Failed', 'Failed'],
    ['Relieved', 'Relieved'],
    ['Pending', 'Pending']
];

const canRelieveBill = (bill) => {
    return (
        ['Pending', 'Unpaid', 'Failed'].includes(bill.status) &&
        ['Attended', 'CancelledLate'].includes(bill.registrationStatus)
    );
};

const canRestoreBill = (bill) => {
    const [year, month] = String(bill.billingMonth || '').split('-').map(Number);
    if (!year || !month) return false;

    const billingMonthEnd = new Date(year, month, 1);
    return bill.status === 'Relieved' && new Date() < billingMonthEnd;
};

const matchesStatusFilter = (bill, selectedStatus) => {
    return selectedStatus === 'All' || bill.status === selectedStatus;
};

const matchesRegistrationStatusFilter = (bill, selectedRegistrationStatus) => {
    return selectedRegistrationStatus === 'All' || bill.registrationStatus === selectedRegistrationStatus;
};

export default function BillManagement({ token }) {
    const [bills, setBills] = useState([]);
    const [recommendationBills, setRecommendationBills] = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('All');
    const [registrationStatus, setRegistrationStatus] = useState('All');
    const [month, setMonth] = useState('');
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState('');
    const [showRecommendations, setShowRecommendations] = useState(false);

    const totals = useMemo(() => {
        return bills.reduce((acc, bill) => {
            acc.count += 1;
            if (bill.status !== 'Relieved' && bill.status !== 'Cancelled') {
                acc.amount += Number(bill.amount) || 0;
            }
            return acc;
        }, { count: 0, amount: 0 });
    }, [bills]);

    const recommendations = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (keyword.length === 0) return [];

        const values = new Map();
        recommendationBills.forEach((bill) => {
            [
                bill.participant?.username,
                bill.participant?.email,
                bill.host?.username,
                bill.host?.email,
                bill.event?.title
            ].filter(Boolean).forEach((value) => {
                if (value.toLowerCase().includes(keyword)) {
                    values.set(value.toLowerCase(), value);
                }
            });
        });

        return Array.from(values.values()).slice(0, 6);
    }, [recommendationBills, search]);

    const loadBills = async (filters = { search, status, registrationStatus, month }) => {
        setLoading(true);
        try {
            const data = await fetchAdminBills(token, filters);
            setBills(data.bills || []);
            setFeedback('');
        } catch (err) {
            setFeedback(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) return;

        const timer = window.setTimeout(() => {
            loadBills({ search, status, registrationStatus, month });
        }, 250);

        return () => window.clearTimeout(timer);
    }, [token, search, status, registrationStatus, month]);

    useEffect(() => {
        const loadRecommendationBills = async () => {
            try {
                const data = await fetchAdminBills(token, { status: 'All' });
                setRecommendationBills(data.bills || []);
            } catch {
                setRecommendationBills([]);
            }
        };

        if (token) {
            loadRecommendationBills();
        }
    }, [token]);

    const applyRecommendation = async (value) => {
        setSearch(value);
        setShowRecommendations(false);
    };

    const handleRelieve = async (bill) => {
        if (!window.confirm(`Relieve current bill for ${bill.participant?.email || 'participant'}?`)) {
            return;
        }

        try {
            const data = await relieveAdminBill(token, bill.invoiceId || bill.registrationId || bill._id);
            setBills(current => current.map(item => {
                const sameBill = (
                    item._id === data.bill._id ||
                    item.registrationId === data.bill.registrationId ||
                    item.invoiceId === data.bill.invoiceId
                );
                if (!sameBill) return item;
                return matchesStatusFilter(data.bill, status) &&
                    matchesRegistrationStatusFilter(data.bill, registrationStatus)
                    ? data.bill
                    : null;
            }).filter(Boolean));
            setFeedback(data.message);
        } catch (err) {
            setFeedback(err.message);
        }
    };

    const handleRestore = async (bill) => {
        if (!window.confirm(`Restore relieved bill for ${bill.participant?.email || 'participant'}?`)) {
            return;
        }

        try {
            const data = await restoreAdminBill(token, bill.invoiceId || bill._id);
            setBills(current => current.map(item => {
                const sameBill = (
                    item._id === data.bill._id ||
                    item.registrationId === data.bill.registrationId ||
                    item.invoiceId === data.bill.invoiceId
                );
                if (!sameBill) return item;
                return matchesStatusFilter(data.bill, status) &&
                    matchesRegistrationStatusFilter(data.bill, registrationStatus)
                    ? data.bill
                    : null;
            }).filter(Boolean));
            setFeedback(data.message);
        } catch (err) {
            setFeedback(err.message);
        }
    };

    return (
        <>
            {feedback && <p className="admin-feedback">{feedback}</p>}

            <div className="admin-bills__filters">
                <div className="admin-bills__search-wrap">
                    <input
                        className="admin-search"
                        placeholder="Search participant, host, email, or event..."
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value);
                            setShowRecommendations(true);
                        }}
                        onFocus={() => setShowRecommendations(true)}
                    />
                    {showRecommendations && recommendations.length > 0 && (
                        <AdminRecommendations
                            className="admin-bills__recommendations"
                            items={recommendations}
                            onSelect={applyRecommendation}
                        />
                    )}
                </div>
                <label className="admin-filter-field">
                    <span>Invoice status</span>
                    <select className="admin-input" value={status} onChange={e => setStatus(e.target.value)}>
                        {invoiceStatusOptions.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </label>
                <label className="admin-filter-field">
                    <span>Registration status</span>
                    <select
                        className="admin-input"
                        value={registrationStatus}
                        onChange={e => setRegistrationStatus(e.target.value)}
                    >
                        {registrationStatusOptions.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </label>
                <input
                    className="admin-input"
                    type="month"
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                />
            </div>

            <div className="admin-bills__summary">
                <span>{totals.count} {summaryLabel(status)}</span>
                <strong>{formatAdminMoney(totals.amount)}</strong>
            </div>

            {loading ? (
                <p className="admin-empty">Loading billable participant bills...</p>
            ) : (
                <div className="admin-table-wrap admin-bills__table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Participant</th>
                                <th>Host</th>
                                <th>Event</th>
                                <th>Month</th>
                                <th>Amount</th>
                                <th>Invoice</th>
                                <th>Registration</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bills.length === 0 && (
                                <tr><td colSpan={8} className="admin-empty">No matching bills found.</td></tr>
                            )}
                            {bills.map(bill => (
                                <tr key={bill._id} className={bill.status === 'Relieved' || bill.status === 'Cancelled' ? 'admin-table__row--inactive' : ''}>
                                    <td>
                                        <strong>{bill.participant?.username || '-'}</strong>
                                        <p className="admin-muted">{bill.participant?.email || '-'}</p>
                                    </td>
                                    <td>
                                        <strong>{bill.host?.username || '-'}</strong>
                                        <p className="admin-muted">{bill.host?.email || '-'}</p>
                                    </td>
                                    <td>
                                        <strong>{bill.event?.title || '-'}</strong>
                                        <p className="admin-muted">{formatAdminDate(bill.event?.datetime || bill.event?.date)}</p>
                                    </td>
                                    <td>{bill.billingMonth}</td>
                                    <td>{formatAdminMoney(bill.amount, bill.currency)}</td>
                                    <td>
                                        <span className={`admin-badge ${statusClass(bill.status)}`}>
                                            {bill.status}
                                        </span>
                                        {bill.lastPaymentError && (
                                            <p className="admin-feedback admin-feedback--sm">{bill.lastPaymentError}</p>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${registrationStatusClass(bill.registrationStatus)}`}>
                                            {bill.registrationStatus || '-'}
                                        </span>
                                    </td>
                                    <td>
                                        {bill.status === 'Relieved' ? (
                                            <button
                                                type="button"
                                                className="admin-btn admin-btn--sm admin-btn--approve"
                                                disabled={!canRestoreBill(bill)}
                                                onClick={() => handleRestore(bill)}
                                            >
                                                Restore
                                            </button>
                                        ) : bill.status === 'Cancelled' ? (
                                            <span className="admin-muted">—</span>
                                        ) : (
                                            <button
                                                type="button"
                                                className="admin-btn admin-btn--sm admin-btn--relieve"
                                                disabled={!canRelieveBill(bill)}
                                                onClick={() => handleRelieve(bill)}
                                            >
                                                Relieve
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
