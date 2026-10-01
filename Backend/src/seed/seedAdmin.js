import Admin from '../models/Admin.js';

const ADMIN_EMAIL = 'test.admin@gmail.com';
const ADMIN_PASSWORD = 'Admin@EventFinder!';
const ADMIN_USERNAME = 'Admin';

export const seedAdmin = async () => {
    const existing = await Admin.findOne({ email: ADMIN_EMAIL });
    if (existing) {
        existing.username = ADMIN_USERNAME;
        existing.password = ADMIN_PASSWORD;
        existing.active = true;
        existing.failedLoginAttempts = [];
        existing.temporaryDeactivationUntil = null;
        await existing.save();

        return { adminEmail: ADMIN_EMAIL, created: false };
    }

    await Admin.create({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        active: true
    });

    return { adminEmail: ADMIN_EMAIL, created: true };
};
