import universities from '../data/universities.json' with { type: 'json' };

// Extract all domains from German universities
const germanUniversityDomains = new Set(
    universities
        .filter(u => u.alpha_two_code === 'DE')
        .flatMap(u => u.domains)
);

export const isGermanUniversityEmail = (email) => {
    const domain = String(email || '').split('@')[1]?.toLowerCase();
    return germanUniversityDomains.has(domain);
};

export const getGermanUniversityByEmail = (email) => {
    const domain = String(email || '').split('@')[1]?.toLowerCase();
    return universities.find(
        u => u.alpha_two_code === 'DE' && u.domains.includes(domain)
    );
};
