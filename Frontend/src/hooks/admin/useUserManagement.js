import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAdminUsers, toggleDeactivateUser, gdprDeleteUser } from '../../api/adminApi.js';

const sortByNewestRegistration = (items) => {
    return [...items].sort((left, right) => {
        const leftDeleted = Boolean(left.gdprDeletedAt);
        const rightDeleted = Boolean(right.gdprDeletedAt);
        if (leftDeleted !== rightDeleted) return leftDeleted ? 1 : -1;

        const leftInactive = left.active === false;
        const rightInactive = right.active === false;
        if (leftInactive !== rightInactive) return leftInactive ? 1 : -1;

        const dateDifference = new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
        if (dateDifference !== 0) return dateDifference;

        return String(left.username || '').localeCompare(String(right.username || ''), undefined, {
            sensitivity: 'base'
        });
    });
};

export default function useUserManagement(token) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [feedback, setFeedback] = useState({});
    const [gdprTarget, setGdprTarget] = useState(null);
    const [showRecommendations, setShowRecommendations] = useState(false);

    const load = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await fetchAdminUsers(token);
            setUsers(sortByNewestRegistration(data));
            setFeedback(p => {
                const next = { ...p };
                delete next._g;
                return next;
            });
        } catch (e) {
            setFeedback(p => ({ ...p, _g: e.message }));
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const handleDeactivate = async (user) => {
        const action = user.active ? 'Deactivate' : 'Reactivate';
        if (!window.confirm(`${action} "${user.username}"?`)) return;
        try {
            const res = await toggleDeactivateUser(token, user._id);
            setUsers(p => sortByNewestRegistration(p.map(u =>
                u._id === user._id ? { ...u, active: res.active } : u
            )));
        } catch (e) {
            setFeedback(p => ({ ...p, [user._id]: { msg: `❌ ${e.message}`, ok: false } }));
        }
    };

    const handleGdprDelete = async () => {
        if (!gdprTarget) return;
        try {
            await gdprDeleteUser(token, gdprTarget._id);
            setGdprTarget(null);
            load();
        } catch (e) {
            setFeedback(p => ({ ...p, [gdprTarget._id]: { msg: `❌ ${e.message}`, ok: false } }));
            setGdprTarget(null);
        }
    };

    const filtered = users.filter(u => {
        const matchRole = roleFilter === 'All' || u.role === roleFilter;
        const matchSearch = u.username?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase());
        return matchRole && matchSearch;
    });

    const recommendations = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return [];

        const values = new Map();
        users.forEach((user) => {
            if (roleFilter !== 'All' && user.role !== roleFilter) return;

            [user.username, user.email].filter(Boolean).forEach((value) => {
                const normalized = value.toLowerCase();
                if (normalized.includes(keyword)) {
                    values.set(normalized, value);
                }
            });
        });

        return Array.from(values.values()).slice(0, 6);
    }, [users, search, roleFilter]);

    return {
        filtered, loading, search, setSearch,
        roleFilter, setRoleFilter, feedback,
        gdprTarget, setGdprTarget, handleDeactivate, handleGdprDelete,
        recommendations, showRecommendations, setShowRecommendations
    };
}
