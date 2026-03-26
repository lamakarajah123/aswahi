import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { User, Notification } from '../models';
import { env } from '../config/env';
import { EmailService } from './email.service';
import https from 'https';

export class AuthService {
    async issueAppToken(user: any): Promise<{ token: string; expires_at: Date }> {
        const payload = {
            sub: user.id,
            email: user.dataValues?.email ?? user.email,
            role: user.dataValues?.role ?? user.role,
        };

        const expiresIn = '24h';
        const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn });

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        return { token, expires_at: expiresAt };
    }

    async loginWithPassword(email: string, password: string): Promise<{ token: string; expires_at: Date; user: any; roles: string[]; permissions: string[] }> {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new Error('Invalid email or password');
        }

        const passwordHash = user.password_hash;

        if (!passwordHash) {
            throw new Error('Invalid email or password');
        }

        const valid = await bcrypt.compare(password, passwordHash);
        if (!valid) {
            throw new Error('Invalid email or password');
        }

        if (user.status === 'pending') {
            throw new Error('Your account is pending admin approval');
        } else if (user.status === 'suspended') {
            throw new Error('Your account is suspended');
        } else if (user.status === 'archived') {
            throw new Error('Your account has been archived. You can no longer log in.');
        }

        // Update last login
        await user.update({ last_login: new Date() } as any);

        const { token, expires_at } = await this.issueAppToken(user);

        return {
            token,
            expires_at,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                last_login: user.last_login,
            },
            roles: [user.role],
            permissions: [],
        };
    }

    async getOrCreateUser(platformSub: string, email: string, name: string, role: string = 'customer'): Promise<any> {
        let user = await User.findByPk(platformSub);

        if (!user) {
            const password_hash = await AuthService.hashPassword('Password123!');
            user = await User.create({
                id: platformSub,
                email,
                name,
                role,
                status: 'active',
                password_hash,
            } as any);
        } else {
            const password_hash = await AuthService.hashPassword('Password123!');
            await user.update({ email, name, role, password_hash, last_login: new Date() } as any);
            return user;
        }

        await user.update({ last_login: new Date() } as any);
        return user;
    }

    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 12);
    }

    async signupWithPassword({
        email, password, name, role, phone, address, work_area, working_hours, vehicle_type, transaction
    }: {
        email: string; password: string; name: string; role: string;
        phone?: string; address?: string; work_area?: string; working_hours?: string; vehicle_type?: string;
        transaction?: any;
    }): Promise<{ user: any; message?: string; token?: string; expires_at?: Date }> {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new Error('Email is already registered');
        }

        const password_hash = await AuthService.hashPassword(password);
        const status = role === 'driver' ? 'pending' : 'active';

        const id = crypto.randomUUID();

        const user = await User.create({
            id,
            email,
            name,
            role,
            status,
            password_hash,
            phone,
            address,
            work_area,
            working_hours,
            vehicle_type
        } as any, transaction ? { transaction } : undefined);

        if (status === 'pending') {
            try {
                // Notify all admins and super_admins
                const admins = await User.findAll({
                    where: {
                        role: {
                            [Op.in]: ['admin', 'super_admin']
                        }
                    }
                });

                const notifications = admins.map(admin => ({
                    user_id: admin.id,
                    title: 'New Driver Pending Approval',
                    body: `A new driver, ${name} (${email}), has registered and is waiting for your approval.`,
                    type: 'driver_pending',
                    created_at: new Date()
                }));

                if (notifications.length > 0) {
                    await Notification.bulkCreate(notifications as any);
                }
            } catch (err) {
                console.error('Failed to notify admins about new driver', err);
            }

            return {
                user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
                message: 'Account created successfully. Awaiting admin approval.',
            };
        }

        const { token, expires_at } = await this.issueAppToken(user);

        return {
            user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
            token,
            expires_at,
        };
    }

    async forgotPassword(email: string): Promise<void> {
        const user = await User.findOne({ where: { email } });
        if (!user) return; // Prevent enumeration

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        await user.update({
            reset_otp: otp,
            reset_otp_expires: expiresAt
        });

        const emailService = new EmailService();
        await emailService.sendPasswordResetEmail(user.email, otp);
    }

    async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
        const user = await User.findOne({ where: { email } });
        if (!user) throw new Error('Invalid email or OTP');

        if (!user.reset_otp || user.reset_otp !== otp) {
            throw new Error('Invalid OTP');
        }

        if (!user.reset_otp_expires || user.reset_otp_expires < new Date()) {
            throw new Error('OTP has expired');
        }

        const password_hash = await AuthService.hashPassword(newPassword);

        await user.update({
            password_hash,
            reset_otp: null,
            reset_otp_expires: null
        });
    }

    async loginWithFacebook(accessToken: string): Promise<{ token: string; expires_at: Date; user: any; roles: string[] }> {
        // Verify Facebook access_token with FB Graph API
        const fbData = await new Promise<any>((resolve, reject) => {
            https.get(
                `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`,
                (res) => {
                    let body = '';
                    res.on('data', (chunk) => { body += chunk; });
                    res.on('end', () => {
                        try { resolve(JSON.parse(body)); }
                        catch { reject(new Error('Invalid Facebook response')); }
                    });
                }
            ).on('error', reject);
        });

        if (fbData.error || !fbData.id) {
            throw new Error('Invalid Facebook token');
        }

        const fbId = `fb_${fbData.id}`;
        const fbEmail = fbData.email || `fb_${fbData.id}@facebook.com`;
        const fbName = fbData.name || 'Facebook User';

        // Find by facebook id OR by email
        let user = await User.findOne({ where: { id: fbId } });
        if (!user && fbData.email) {
            user = await User.findOne({ where: { email: fbData.email } });
        }

        if (!user) {
            // Create new customer account
            user = await User.create({
                id: fbId,
                email: fbEmail,
                name: fbName,
                role: 'customer',
                status: 'active',
            } as any);
        } else {
            if (user.status === 'suspended') throw new Error('Your account is suspended');
            if (user.status === 'archived') throw new Error('Your account has been archived');
        }

        await user.update({ last_login: new Date() } as any);
        const { token, expires_at } = await this.issueAppToken(user);

        return {
            token,
            expires_at,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            roles: [user.role],
        };
    }
}
