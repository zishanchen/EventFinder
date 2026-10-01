import { useState, useEffect } from 'react';
import { fetchAdminStats } from '../../api/adminApi.js';

export default function useAdminStats(token) {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        fetchAdminStats(token)
            .then((data) => {
                setStats(data);
                setError(null);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [token]);

    return { stats, error, loading };
}
