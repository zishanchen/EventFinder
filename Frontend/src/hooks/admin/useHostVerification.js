import { useState, useEffect, useCallback } from 'react';
import { fetchPendingHosts, verifyHost, rejectHost } from '../../api/adminApi.js';

export default function useHostVerification(token) {
    const [hosts, setHosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tokenInputs, setTokenInputs] = useState({});
    const [feedback, setFeedback] = useState({});

    const load = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            setHosts(await fetchPendingHosts(token));
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

    const setMsg = (id, msg, ok) =>
        setFeedback(p => ({ ...p, [id]: { msg, ok } }));

    const handleVerify = async (host) => {
        const entered = (tokenInputs[host._id] ?? '').trim();
        if (!entered) {
            setMsg(host._id, 'Please paste the token received via DM.', false);
            return;
        }
        try {
            await verifyHost(token, host._id, entered);
            setMsg(host._id, '✅ Host verified successfully!', true);
            load();
        } catch (e) {
            setMsg(host._id, `❌ ${e.message}`, false);
        }
    };

    const handleReject = async (host) => {
        if (!window.confirm(`Reject and deactivate "${host.username}"?`)) return;
        try {
            await rejectHost(token, host._id);
            setMsg(host._id, '🚫 Host rejected.', true);
            load();
        } catch (e) {
            setMsg(host._id, `❌ ${e.message}`, false);
        }
    };

    const setTokenInput = (hostId, value) =>
        setTokenInputs(p => ({ ...p, [hostId]: value }));

    return {
        hosts, loading, tokenInputs, feedback,
        setTokenInput, handleVerify, handleReject
    };
}
