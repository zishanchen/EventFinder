const PASSWORD_RULES = [
    {
        key: 'length',
        label: 'At least 8 characters',
        isMet: (password) => password.length >= 8,
        message: 'Password must be at least 8 characters'
    },
    {
        key: 'uppercase',
        label: 'At least one capital letter',
        isMet: (password) => /[A-Z]/.test(password),
        message: 'Password must contain at least one capital letter'
    },
    {
        key: 'special',
        label: 'At least one special character (!@#$%^&*...)',
        isMet: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
        message: 'Password must contain at least one special character'
    }
];

const validatePassword = (password) => {
    if (!password) return 'Password is required';

    const failedRule = PASSWORD_RULES.find((rule) => !rule.isMet(password));
    return failedRule?.message || null;
};

export { PASSWORD_RULES, validatePassword };
