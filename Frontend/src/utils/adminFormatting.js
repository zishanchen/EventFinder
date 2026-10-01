export const formatAdminDate = (value) => {
    if (!value) return '—';

    return new Date(value).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

export const formatAdminMoney = (amount, currency = 'eur') => {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: String(currency || 'eur').toUpperCase()
    }).format(Number(amount) || 0);
};
