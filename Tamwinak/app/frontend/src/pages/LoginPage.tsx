import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Leaf,
  LogIn,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldCheck,
  Store,
  Truck,
  User,
  Users,
  Copy,
  Check,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Footer } from '@/components/Footer';
import type { TestAccount } from '@/types';

const ROLE_ICONS: Record<string, React.ElementType> = {
  super_admin: ShieldCheck,
  admin: Shield,
  store_owner: Store,
  store_staff: Store,
  driver: Truck,
  customer: User,
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  store_owner: 'bg-blue-100 text-blue-700',
  store_staff: 'bg-cyan-100 text-cyan-700',
  driver: 'bg-orange-100 text-orange-700',
  customer: 'bg-green-100 text-green-700',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  store_owner: 'Store Owner',
  store_staff: 'Store Staff',
  driver: 'Driver',
  customer: 'Customer',
};

const ROLE_ROUTES: Record<string, string> = {
  super_admin: '/super-admin',
  admin: '/',
  store_owner: '/store-dashboard',
  store_staff: '/store-dashboard',
  driver: '/driver',
  customer: '/',
};

export default function LoginPage() {
  const { user, loginWithPassword, loginWithFacebook, loading: authLoading, roles } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [testAccounts, setTestAccounts] = useState<TestAccount[]>([]);
  const [showAccounts, setShowAccounts] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Load Facebook JS SDK
  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) return;
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
    script.onload = () => {
      (window as any).FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
        cookie: true,
        xfbml: true,
        version: 'v19.0',
      });
    };
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      const primaryRole = roles[0] || 'customer';
      const searchParams = new URLSearchParams(location.search);
      const redirectPath = searchParams.get('redirect');

      const targetPath = redirectPath || ROLE_ROUTES[primaryRole] || '/';
      navigate(targetPath, { replace: true });
    }
  }, [user, authLoading, roles, navigate, location]);

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email');
      return;
    }
    try {
      setResetLoading(true);
      await apiCall.invoke({
        url: '/api/v1/auth/forgot-password',
        method: 'POST',
        data: { email: resetEmail },
      });
      toast.success('If the email exists, a password reset code has been sent.');
      setResetStep(2);
    } catch {
      toast.error('Failed to send reset code');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtp || !newPassword) {
      toast.error('Please enter the OTP and your new password');
      return;
    }
    try {
      setResetLoading(true);
      await apiCall.invoke({
        url: '/api/v1/auth/reset-password',
        method: 'POST',
        data: { email: resetEmail, otp: resetOtp, newPassword },
      });
      toast.success('Password has been reset successfully!');
      setForgotPasswordOpen(false);
      setResetStep(1);
      setResetEmail('');
      setResetOtp('');
      setNewPassword('');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError('Please enter both email and password');
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError(null);
      await loginWithPassword(email, password);
      // Redirect will happen via the useEffect above
      toast.success('Login successful!');
    } catch (err: any) {
      const msg = err?.message || 'Login failed. Please check your credentials.';
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    const FB = (window as any).FB;
    if (!FB) {
      toast.error('Facebook SDK not loaded yet. Please try again.');
      return;
    }
    setFbLoading(true);
    setLoginError(null);
    FB.login(
      async (response: any) => {
        if (response.authResponse?.accessToken) {
          try {
            await loginWithFacebook(response.authResponse.accessToken);
            toast.success('تم تسجيل الدخول عبر فيسبوك بنجاح!');
          } catch (err: any) {
            setLoginError(err.message || 'Facebook login failed');
            toast.error(err.message || 'Facebook login failed');
          } finally {
            setFbLoading(false);
          }
        } else {
          setFbLoading(false);
          toast.error('تم إلغاء تسجيل الدخول عبر فيسبوك');
        }
      },
      { scope: 'email,public_profile' }
    );
  };

  const handleQuickLogin = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword('Password123!');
    setLoginError(null);
  };

  const seedAccounts = async () => {
    try {
      setSeeding(true);
      const response = await apiCall.invoke({
        url: '/api/v1/seed/accounts',
        method: 'POST',
      });
      const data = response.data;
      toast.success(
        `Seed complete: ${data.total_created} created, ${data.total_skipped} skipped`
      );
    } catch (err: any) {
      toast.error('Failed to seed accounts. They may already exist.');
    } finally {
      setSeeding(false);
    }
  };

  const fetchTestAccounts = async () => {
    if (testAccounts.length > 0) return;
    try {
      setLoadingAccounts(true);
      const response = await apiCall.invoke({
        url: '/api/v1/auth-info/test-accounts',
        method: 'GET',
      });
      setTestAccounts(response.data || []);
    } catch {
      setTestAccounts([
        { name: 'Ahmad Al-Rashid', email: 'superadmin@tamweenak.com', phone: '+966501000001', role: 'super_admin', status: 'active' },
        { name: 'Fatima Al-Zahrani', email: 'admin@tamweenak.com', phone: '+966501000002', role: 'admin', status: 'active' },
        { name: 'Khalid Al-Otaibi', email: 'store1@tamweenak.com', phone: '+966501000003', role: 'store_owner', status: 'active' },
        { name: 'Noura Al-Dosari', email: 'store2@tamweenak.com', phone: '+966501000004', role: 'store_owner', status: 'active' },
        { name: 'Omar Al-Harbi', email: 'staff1@tamweenak.com', phone: '+966501000005', role: 'store_staff', status: 'active' },
        { name: 'Layla Al-Qahtani', email: 'staff2@tamweenak.com', phone: '+966501000006', role: 'store_staff', status: 'active' },
        { name: 'Saeed Al-Ghamdi', email: 'driver1@tamweenak.com', phone: '+966501000007', role: 'driver', status: 'active' },
        { name: 'Youssef Al-Shehri', email: 'driver2@tamweenak.com', phone: '+966501000008', role: 'driver', status: 'active' },
        { name: 'Hassan Al-Malki', email: 'driver3@tamweenak.com', phone: '+966501000009', role: 'driver', status: 'active' },
        { name: 'Maryam Al-Subaie', email: 'customer1@tamweenak.com', phone: '+966501000010', role: 'customer', status: 'active' },
        { name: 'Abdullah Al-Mutairi', email: 'customer2@tamweenak.com', phone: '+966501000011', role: 'customer', status: 'active' },
        { name: 'Sara Al-Tamimi', email: 'customer3@tamweenak.com', phone: '+966501000012', role: 'customer', status: 'active' },
        { name: 'Faisal Al-Dawsari', email: 'customer4@tamweenak.com', phone: '+966501000013', role: 'customer', status: 'active' },
        { name: 'Huda Al-Juhani', email: 'customer5@tamweenak.com', phone: '+966501000014', role: 'customer', status: 'active' },
      ]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const copyEmail = (emailToCopy: string) => {
    navigator.clipboard.writeText(emailToCopy);
    setCopiedEmail(emailToCopy);
    toast.success(`Copied: ${emailToCopy}`);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleToggleAccounts = () => {
    const next = !showAccounts;
    setShowAccounts(next);
    if (next) fetchTestAccounts();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  const groupedAccounts = testAccounts.reduce<Record<string, TestAccount[]>>(
    (acc, account) => {
      if (!acc[account.role]) acc[account.role] = [];
      acc[account.role].push(account);
      return acc;
    },
    {}
  );

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
            <span className="text-xl font-bold text-gray-900">Aswahi</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700"
          >
            Back to Home
          </Button>
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto px-4 py-12">
        {/* Login Card */}
        <div className="max-w-md mx-auto mb-8">
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {t('auth.welcome', 'Welcome to Aswahi')}
              </CardTitle>
              <p className="text-gray-500 mt-2">
                {t('auth.signin_desc', 'Sign in to access your grocery delivery dashboard')}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
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
                        setLoginError(null);
                      }}
                      className="pl-10 h-11"
                      autoComplete="email"
                    />
                  </div>
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
                      placeholder={t('auth.password_placeholder', 'Enter your password')}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setLoginError(null);
                      }}
                      className="pl-10 pr-10 h-11"
                      autoComplete="current-password"
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

                {/* Error Message */}
                {loginError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordOpen(true);
                      setResetStep(1);
                      setResetEmail(email);
                    }}
                    className="text-sm text-green-600 font-semibold hover:underline"
                  >
                    {t('auth.forgot_password', 'Forgot Password?')}
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t('auth.signing_in', 'Signing In...')}
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      {t('auth.signin_button', 'Sign In')}
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  {t('auth.signup_prompt', "Don't have an account?")}{' '}
                  <Link to="/signup" className="text-green-600 font-semibold hover:underline">
                    {t('auth.signup_link', 'Sign Up')}
                  </Link>
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">أو</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Facebook Login */}
              <button
                type="button"
                onClick={handleFacebookLogin}
                disabled={fbLoading}
                className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-lg h-12 font-semibold text-sm transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              >
                {fbLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.427c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.237 2.686.237v2.953h-1.514c-1.491 0-1.956.927-1.956 1.878v2.247h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                  </svg>
                )}
                {fbLoading ? 'جاري الدخول...' : 'تسجيل الدخول بفيسبوك'}
              </button>

              <p className="text-center text-xs text-gray-400 mt-2">
                Secure authentication with bcrypt password hashing
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Seed & Test Accounts Section */}
        <div className="max-w-md mx-auto mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={seedAccounts}
            disabled={seeding}
            className="w-full mb-3 text-sm"
          >
            {seeding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Seeding Accounts...
              </>
            ) : (
              '🌱 Initialize Test Accounts (run once)'
            )}
          </Button>
        </div>

        <Collapsible open={showAccounts} onOpenChange={handleToggleAccounts}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full max-w-md mx-auto flex items-center justify-center gap-2 mb-4"
            >
              <Users className="w-4 h-4" />
              Test Accounts ({testAccounts.length || 14})
              {showAccounts ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {loadingAccounts ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 text-green-600 animate-spin mx-auto" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                    Default Password: Password123!
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(groupedAccounts).map(([role, accounts]) => {
                    const Icon = ROLE_ICONS[role] || User;
                    const colorClass =
                      ROLE_COLORS[role] || 'bg-gray-100 text-gray-700';
                    return (
                      <Card key={role} className="border shadow-sm">
                        <CardHeader className="pb-2 pt-4 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <CardTitle className="text-sm font-semibold">
                                {ROLE_LABELS[role] || role}
                              </CardTitle>
                              <p className="text-[10px] text-gray-400">
                                {accounts.length} account
                                {accounts.length > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-2">
                          {accounts.map((account) => (
                            <div
                              key={account.email}
                              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-green-50 transition-colors"
                              onClick={() => handleQuickLogin(account.email)}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {account.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {account.email}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyEmail(account.email);
                                  }}
                                >
                                  {copiedEmail === account.email ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-gray-400" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {resetStep === 1
                ? "Enter your email address to receive a 6-digit verification code."
                : "Enter the code sent to your email and your new password."}
            </DialogDescription>
          </DialogHeader>

          {resetStep === 1 ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <Button type="submit" disabled={resetLoading} className="w-full bg-green-600 hover:bg-green-700 text-white">
                {resetLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Reset Code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>OTP Code</Label>
                <Input
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                  placeholder="123456"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={resetLoading} className="w-full bg-green-600 hover:bg-green-700 text-white">
                {resetLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Reset Password
              </Button>
              <div className="text-center mt-2">
                <button type="button" onClick={() => setResetStep(1)} className="text-xs text-gray-500 hover:underline">
                  Go back
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
