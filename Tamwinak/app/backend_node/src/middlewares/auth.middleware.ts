import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models';

export interface AuthRequest extends Request {
    user?: any;
}

// Simple in-process user cache keyed by user ID — avoids a DB round-trip on
// every authenticated request.  Entries expire after 60 s.
interface CacheEntry { user: any; expiresAt: number; }
const userCache = new Map<string, CacheEntry>();
const USER_CACHE_TTL_MS = 60_000;

export function invalidateUserCache(userId: string): void {
    userCache.delete(userId);
}

export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, env.JWT_SECRET, async (err: any, decoded: any) => {
            if (err) {
                res.status(403).json({ detail: 'Forbidden or Invalid Token' });
                return;
            }

            try {
                const userId: string = decoded.sub || decoded.id;
                const now = Date.now();
                const cached = userCache.get(userId);

                let user: any;
                if (cached && now < cached.expiresAt) {
                    user = cached.user;
                } else {
                    user = await User.findByPk(userId, {
                        attributes: ['id', 'email', 'name', 'role', 'status', 'created_at', 'last_login', 'phone', 'address', 'work_area', 'working_hours', 'vehicle_type', 'is_available'],
                    });
                    if (!user) {
                        res.status(401).json({ detail: 'User not found' });
                        return;
                    }
                    userCache.set(userId, { user, expiresAt: now + USER_CACHE_TTL_MS });
                }

                req.user = user;
                next();
            } catch (dbErr: any) {
                console.error('[AUTH_MIDDLEWARE_DB_ERR]', dbErr);
                res.status(500).json({ detail: 'Internal Database Error during Auth: ' + dbErr.message });
            }
        });
    } else {
        res.status(401).json({ detail: 'Unauthorized: No token provided in Authorization header' });
    }
};
