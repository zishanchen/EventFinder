import jwt from 'jsonwebtoken';
import Account from '../models/Account.js';
import '../models/Participant.js';
import '../models/Host.js';
import { JWT_SECRET } from '../config/appConfig.js';

const checkAuthentication = (req, res, next) => {
    let token = '';

    if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No token provided in the request'
        });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Failed to authenticate token'
            });
        }

        try {
            const user = await Account.findById(decoded._id)
                .select('role active tokenVersion isVerified verified gdprDeletedAt')
                .lean();
            if (!user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User account no longer exists'
                });
            }

            if (user.gdprDeletedAt) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User account no longer exists'
                });
            }

            if (!user.active) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Account is deactivated'
                });
            }

            if (user.role === 'Participant' && !user.isVerified) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Please verify your email address before continuing'
                });
            }

            if (user.role === 'Host' && !user.verified) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Host account is pending verification'
                });
            }

            const decodedTokenVersion = Number(decoded.tokenVersion || 0);
            if (decodedTokenVersion !== Number(user.tokenVersion || 0)) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Session has been invalidated'
                });
            }

            req.userId = decoded._id;
            req.userRole = user.role;
            next();
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    });
};

const requireRole = (role) => {
    return (req, res, next) => {
        const allowedRoles = Array.isArray(role) ? role : [role];

        if (!allowedRoles.includes(req.userRole)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Access restricted to ${allowedRoles.join(' or ')} only`
            });
        }
        next();
    };
};

export { checkAuthentication, requireRole };
