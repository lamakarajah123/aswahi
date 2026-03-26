import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { Footer } from '@/components/Footer';

interface SignupPayload {
    name: string;
    email: string;
    password: string;
    role: string;
    phone: string;
    address: string;
    work_area?: string;
    working_hours?: string;
    vehicle_type?: string;
}

export default function SignupPage() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('customer');

    // New fields
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [workArea, setWorkArea] = useState('');
    const [workingHours, setWorkingHours] = useState('');
    const [vehicleType, setVehicleType] = useState('car'); // default car

    const [showPassword, setShowPassword] = useState(false);
    const [signupLoading, setSignupLoading] = useState(false);
    const [signupError, setSignupError] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) {
            setSignupError(t('auth.fill_fields_error', 'Please fill in all fields'));
            return;
        }

        try {
            setSignupLoading(true);
            setSignupError(null);

            const payload: SignupPayload = { name, email, password, role, phone, address };

            if (role === 'driver') {
                payload.work_area = workArea;
                payload.working_hours = workingHours;
                payload.vehicle_type = vehicleType;
            }

            const response = await apiCall.invoke({
                url: '/api/v1/auth/signup',
                method: 'POST',
                data: payload,
            });

            if (response.data.message) {
                toast.success(response.data.message);
            } else {
                toast.success(t('auth.signup_success', 'Account created successfully! Please login.'));
            }

            navigate('/login');
        } catch (err: any) {
            const msg =
                err?.response?.data?.detail || err?.message || t('auth.signup_failed', 'Signup failed. Please try again.');
            setSignupError(msg);
            toast.error(msg);
        } finally {
            setSignupLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => navigate('/')}
                    >
                        <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
                            <Leaf className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">{t('app.title', 'Tamwinak')}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/')}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        {t('nav.back_home', 'Back to Home')}
                    </Button>
                </div>
            </header>

            <div className="flex-1 max-w-4xl mx-auto px-4 py-12">
                {/* Signup Card */}
                <div className="max-w-md mx-auto mb-8">
                    <Card className="border-0 shadow-xl bg-white">
                        <CardHeader className="text-center pb-2">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User className="w-8 h-8 text-green-600" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-gray-900">
                                {t('auth.signup_title', 'Create an Account')}
                            </CardTitle>
                            <CardDescription className="text-gray-500 mt-2">
                                {t('auth.signup_subtitle', 'Join Aswahi and start enjoying our services')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <form onSubmit={handleSignup} className="space-y-4">
                                {/* Name Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                                        {t('auth.full_name', 'Full Name')}
                                    </Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder={t('auth.full_name_placeholder', 'Enter your name')}
                                            value={name}
                                            onChange={(e) => {
                                                setName(e.target.value);
                                                setSignupError(null);
                                            }}
                                            className="pl-10 h-11"
                                        />
                                    </div>
                                </div>

                                {/* Email Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                        {t('auth.email', 'Email Address')}
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder={t('auth.email_placeholder', 'Enter your email')}
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                setSignupError(null);
                                            }}
                                            className="pl-10 h-11"
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                {/* Phone Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                                        {t('auth.phone', 'Phone Number')}
                                    </Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder={t('auth.phone_placeholder', 'e.g. +972 5780000')}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="h-11"
                                    />
                                </div>

                                {/* Address Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                                        {t('auth.address', 'Full Address')}
                                    </Label>
                                    <Input
                                        id="address"
                                        type="text"
                                        placeholder={t('auth.address_placeholder', 'Enter your address')}
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="h-11"
                                    />
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="password"
                                        className="text-sm font-medium text-gray-700"
                                    >
                                        {t('auth.password', 'Password')}
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder={t('auth.create_password_placeholder', 'Create a password')}
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                setSignupError(null);
                                            }}
                                            className="pl-10 pr-10 h-11"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Role Selection */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">{t('auth.iam_a', 'I am a...')}</Label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="customer"
                                                checked={role === 'customer'}
                                                onChange={() => setRole('customer')}
                                                className="text-green-600 focus:ring-green-500"
                                            />
                                            <span>{t('auth.customer', 'Customer')}</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="driver"
                                                checked={role === 'driver'}
                                                onChange={() => setRole('driver')}
                                                className="text-green-600 focus:ring-green-500"
                                            />
                                            <span>{t('auth.driver', 'Driver')}</span>
                                        </label>
                                    </div>

                                    {role === 'driver' && (
                                        <div className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-4">
                                            <p className="text-sm font-semibold text-gray-700 mb-2">{t('auth.driver_info', 'Driver Additional Info')}</p>

                                            <div className="space-y-2">
                                                <Label className="text-sm text-gray-600">{t('auth.work_area', 'Work Area')}</Label>
                                                <Input
                                                    placeholder={t('auth.work_area_placeholder', 'e.g. ')}
                                                    value={workArea}
                                                    onChange={(e) => setWorkArea(e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm text-gray-600">{t('auth.working_hours', 'Working Hours')}</Label>
                                                <Input
                                                    placeholder={t('auth.working_hours_placeholder', 'e.g. 08:00 AM - 04:00 PM')}
                                                    value={workingHours}
                                                    onChange={(e) => setWorkingHours(e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm text-gray-600">{t('auth.vehicle_type', 'Vehicle Type')}</Label>
                                                <select
                                                    className="w-full h-10 px-3 py-2 rounded-md border text-sm bg-white"
                                                    value={vehicleType}
                                                    onChange={(e) => setVehicleType(e.target.value)}
                                                >
                                                    <option value="car">{t('auth.car', 'Car')} </option>
                                                    <option value="motorcycle">{t('auth.motorcycle', 'Motorcycle')} </option>
                                                </select>
                                            </div>

                                            <p className="text-xs text-orange-600 mt-2">
                                                {t('auth.driver_note', 'Note: Driver accounts require admin approval before you can login.')}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Error Message */}
                                {signupError && (
                                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{signupError}</span>
                                    </div>
                                )}

                                {/* Signup Button */}
                                <Button
                                    type="submit"
                                    disabled={signupLoading}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
                                >
                                    {signupLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            {t('auth.creating_account', 'Creating Account...')}
                                        </>
                                    ) : (
                                        <>
                                            {t('auth.signup_link', 'Sign Up')}
                                        </>
                                    )}
                                </Button>
                            </form>

                            <div className="mt-4 text-center">
                                <p className="text-sm text-gray-600">
                                    {t('auth.signin_prompt', 'Already have an account?')}
                                    {' '}
                                    <Link to="/login" className="text-green-600 font-semibold hover:underline">
                                        {t('auth.signin_button', 'Sign In')}
                                    </Link>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Footer />
        </div>
    );
}
