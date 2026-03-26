import { Router, Request, Response } from 'express';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';
import { AuthService } from '../services/auth.service';

const router = Router();
const authService = new AuthService();

// POST /api/v1/auth/login  — email + password login (used by frontend)
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ detail: 'email and password are required' });
        }

        const result = await authService.loginWithPassword(email, password);

        // Store also issuing the raw-mode mock token for dev
        res.json(result);
    } catch (error: any) {
        res.status(401).json({ detail: error.message || 'Invalid credentials' });
    }
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ detail: 'email is required' });
        }
        await authService.forgotPassword(email);
        res.json({ message: 'If the email exists, a password reset code has been sent.' });
    } catch (error: any) {
        res.status(500).json({ detail: 'Failed to process forgot password request' });
    }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ detail: 'email, otp, and newPassword are required' });
        }
        await authService.resetPassword(email, otp, newPassword);
        res.json({ message: 'Password has been reset successfully' });
    } catch (error: any) {
        res.status(400).json({ detail: error.message || 'Failed to reset password' });
    }
});

// POST /api/v1/auth/signup  — email + password + name + role signup
router.post('/signup', async (req: Request, res: Response) => {
    try {
        const { email, password, name, role, phone, address, work_area, working_hours, vehicle_type } = req.body;

        if (!email || !password || !name || !role) {
            return res.status(400).json({ detail: 'email, password, name, and role are required' });
        }

        if (!['customer', 'driver'].includes(role)) {
            return res.status(400).json({ detail: 'Invalid role. Must be customer or driver.' });
        }

        const result = await authService.signupWithPassword({
            email, password, name, role, phone, address, work_area, working_hours, vehicle_type
        });

        // If pending driver, result might only have message and user
        if (result.message) {
            return res.status(201).json(result);
        }

        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ detail: error.message || 'Signup failed' });
    }
});

// POST /api/v1/auth/login-dev  — mock SSO-style login for testing (accepts platform_sub)
router.post('/login-dev', async (req: Request, res: Response) => {
    try {
        const { platform_sub, email, name } = req.body;

        if (!platform_sub || !email) {
            return res.status(400).json({ detail: 'platform_sub and email are required for dev login' });
        }

        const user = await authService.getOrCreateUser(platform_sub, email, name);
        const { token, expires_at } = await authService.issueAppToken(user);

        res.json({ token, expires_at });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/v1/auth/me
router.get('/me', authenticateJWT, (req: AuthRequest, res: Response) => {
    // req.user is already restricted to safe attributes by the auth middleware
    res.json(req.user);
});

// POST /api/v1/auth/logout
router.post('/logout', authenticateJWT, (req: AuthRequest, res: Response) => {
    // With stateless JWTs, frontend usually throws it away. 
    // In advanced implementation, we can blacklist the token.
    res.json({ message: 'Successfully logged out' });
});

// POST /api/v1/auth/facebook  — Facebook OAuth login
router.post('/facebook', async (req: Request, res: Response) => {
    try {
        const { access_token } = req.body;
        if (!access_token) {
            return res.status(400).json({ detail: 'access_token is required' });
        }
        const result = await authService.loginWithFacebook(access_token);
        res.json(result);
    } catch (error: any) {
        res.status(401).json({ detail: error.message || 'Facebook login failed' });
    }
});

// GET /api/v1/auth-info/test-accounts
router.get('/auth-info/test-accounts', (req: Request, res: Response) => {
    res.json([
        { role: 'Admin', email: 'admin@tamweenak.com', password: 'Password123!' },
        { role: 'Store Owner', email: 'store@tamweenak.com', password: 'Password123!' },
        { role: 'Driver', email: 'driver@tamweenak.com', password: 'Password123!' },
        { role: 'Customer', email: 'customer@tamweenak.com', password: 'Password123!' },
    ]);
});

// POST /api/v1/seed/accounts
router.post('/seed/accounts', async (req: Request, res: Response) => {
    try {
        const accounts = [
            { platform_sub: 'admin-sub', email: 'admin@tamweenak.com', name: 'Admin User', role: 'admin' },
            { platform_sub: 'store-sub', email: 'store@tamweenak.com', name: 'Store Owner', role: 'store_owner' },
            { platform_sub: 'driver-sub', email: 'driver@tamweenak.com', name: 'Driver User', role: 'driver' },
            { platform_sub: 'customer-sub', email: 'customer@tamweenak.com', name: 'Customer User', role: 'customer' },
        ];

        for (const acc of accounts) {
            const user = await authService.getOrCreateUser(acc.platform_sub, acc.email, acc.name,acc.role);
            // Assign roles if needed (omitted for brevity here but should be in sync with RBAC)
        }
        res.json({ message: 'Test accounts seeded successfully' });
    } catch (error: any) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;
