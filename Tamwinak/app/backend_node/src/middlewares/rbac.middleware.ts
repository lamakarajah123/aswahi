import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const requireRoles = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ detail: 'Insufficient permissions' });
            return;
        }
        next();
    };
};
