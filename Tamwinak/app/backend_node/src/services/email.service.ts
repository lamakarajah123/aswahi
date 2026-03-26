import nodemailer from 'nodemailer';

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {

        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false // Helps with some network/cert restrictions
            }
        });
    }

    async sendStoreWelcomeEmail(to: string, ownerName: string, storeName: string, password: string) {
        const mailOptions = {
            from: process.env.SMTP_FROM || '"Aswahi Admin" <no-reply@aswahi.com>',
            to,
            subject: 'Welcome to Aswahi - Your Store Account Details',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #16a34a; text-align: center;">Welcome to Aswahi!</h2>
                    <p>Hello <strong>${ownerName}</strong>,</p>
                    <p>Your store <strong>${storeName}</strong> has been successfully registered on our platform.</p>
                    <p>You can now log in to the Store Dashboard using the following credentials:</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Email:</strong> ${to}</p>
                        <p style="margin: 10px 0 0 0;"><strong>Password:</strong> ${password}</p>
                    </div>
                    <p style="color: #ef4444; font-size: 12px;"><em>* IMPORTANT: Please change your password after your first login for security reasons.</em></p>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background-color: #16a34a; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Your Dashboard</a>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                    <p style="font-size: 12px; color: #666; text-align: center;">If you didn't expect this email, please contact support.</p>
                </div>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    async sendPasswordResetEmail(to: string, otp: string) {
        const mailOptions = {
            from: process.env.SMTP_FROM || '"Aswahi Admin" <no-reply@aswahi.com>',
            to,
            subject: 'Aswahi - Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <h2 style="color: #16a34a; text-align: center;">Password Reset Request</h2>
                    <p>We received a request to reset the password for your Aswahi account.</p>
                    <p>Your password reset code is:</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #16a34a;">${otp}</span>
                    </div>
                    <p>This code will expire in 15 minutes.</p>
                    <p style="color: #ef4444; font-size: 12px;"><em>* If you didn't request this, you can safely ignore this email.</em></p>
                    <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                    <p style="font-size: 12px; color: #666; text-align: center;">Aswahi Support</p>
                </div>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Password reset email sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending reset email:', error);
            throw error;
        }
    }
}
