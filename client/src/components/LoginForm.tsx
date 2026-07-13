import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from './AuthLayout';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import {
  Sparkles,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  User,
} from 'lucide-react';

const GoogleIcon = () => (
  <svg
    className="w-[18px] h-[18px]"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const LoginForm: React.FC = () => {
  const {
    loginWithGoogle,
    checkGoogleRegistration,
    error: authError,
    clearError,
  } = useAuth();
  const navigate = useNavigate();

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [idToken, setIdToken] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState('CapsLock'));
  };

  const handleConnectGoogle = async () => {
    setLocalError(null);
    clearError();

    if (!isFirebaseConfigured) {
      setGoogleLoading(true);
      setTimeout(() => {
        setGoogleLoading(false);
        setGoogleConnected(true);
        setGoogleEmail('demo-google@inboxos.dev');
        setIdToken('mock-id-token');
        setUsername('demo-user');
      }, 800);
      return;
    }

    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const tokenVal = await result.user.getIdToken();

      // Check if user is registered
      const check = await checkGoogleRegistration(tokenVal);
      if (!check.isRegistered) {
        setLocalError(
          'You have not been registered here. Please register your account first.'
        );
        return;
      }

      setGoogleConnected(true);
      setGoogleEmail(check.email || result.user.email || '');
      setIdToken(tokenVal);
      setUsername(check.username || '');
    } catch (err: any) {
      console.error('Google login popup error:', err);
      setLocalError(err.message || 'Google verification failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const validate = () => {
    let isValid = true;
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else {
      setPasswordError(null);
    }
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await loginWithGoogle(idToken, username, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login submit error:', err);
      setLocalError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full space-y-6 text-left">
        {/* Welcome */}
        <div className="space-y-1.5 pb-2">
          <h3 className="text-[36px] font-bold text-[#1D1D1D] dark:text-zinc-100 tracking-tight leading-none flex items-center gap-2.5">
            Welcome Back{' '}
            <Sparkles
              size={24}
              className="text-[#5F6B38] dark:text-[#778b46]"
            />
          </h3>
          <p className="text-[16px] text-[#6B7280] dark:text-zinc-400">
            Sign in to your AI Inbox Operating System.
          </p>
        </div>

        {/* Auth Errors */}
        {(authError || localError) && (
          <div className="flex items-center gap-3 p-4 bg-[#FFF0F0] dark:bg-red-950/20 border border-[#FCA5A5] dark:border-red-900/30 rounded-[14px] text-[#EF4444] dark:text-red-400 text-xs">
            <AlertCircle
              size={16}
              className="shrink-0 text-[#EF4444] dark:text-red-400"
            />
            <div className="leading-snug font-medium">
              <p>{localError || authError}</p>
              {!googleConnected &&
                localError?.includes('not been registered') && (
                  <Link
                    to="/register"
                    className="underline mt-1.5 block font-bold text-[#b91c1c] dark:text-red-400"
                  >
                    Go to Sign Up Page ➔
                  </Link>
                )}
            </div>
          </div>
        )}

        {!googleConnected ? (
          <div className="space-y-4">
            <p className="text-[14px] text-[#6B7280] dark:text-zinc-400">
              To sign in, first connect your registered Google account:
            </p>
            <button
              type="button"
              disabled={googleLoading}
              onClick={handleConnectGoogle}
              className="w-full h-[54px] flex items-center justify-center gap-3 bg-white dark:bg-zinc-900 border border-[#EAE5DA] dark:border-zinc-800 rounded-[16px] text-[#1D1D1D] dark:text-zinc-200 text-[15px] font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] hover:bg-[#FAF7F2] dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              {googleLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Connect Google Account</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google Identity Badge */}
            <div className="p-3 bg-[#FAF7F2] dark:bg-zinc-800/40 border border-[#EAE5DA] dark:border-zinc-850 rounded-[14px] flex items-center justify-between text-xs text-[#5F6B38] dark:text-[#778b46] font-medium">
              <div className="flex items-center gap-2">
                <GoogleIcon />
                <span>
                  Connected as <strong>{googleEmail}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setGoogleConnected(false)}
                className="underline hover:text-[#4F5A2F] dark:hover:text-[#8ba256]"
              >
                Change
              </button>
            </div>

            {/* Login details Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username (Pre-filled and disabled) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#374151] dark:text-zinc-300 tracking-wide block">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                    <User size={16} strokeWidth={1.5} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    disabled
                    className="w-full h-[54px] pl-11 pr-4 text-[15px] bg-[#FAF7F2] dark:bg-zinc-900/50 border border-[#EAE5DA] dark:border-zinc-800 rounded-[14px] text-[#9CA3AF] dark:text-zinc-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#374151] dark:text-zinc-300 tracking-wide block">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                    <Lock size={16} strokeWidth={1.5} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    disabled={isLoading}
                    className={`w-full h-[54px] pl-11 pr-12 text-[15px] bg-[#FCFCFE] dark:bg-zinc-900 border rounded-[14px] text-[#1D1D1D] dark:text-zinc-200 placeholder-[#9CA3AF] dark:placeholder-zinc-500 outline-none transition-all duration-200 ${
                      passwordError
                        ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-4 focus:ring-[#EF4444]/10'
                        : 'border-[#EAE5DA] dark:border-zinc-800 focus:border-[#5F6B38] dark:focus:border-[#778b46] focus:ring-4 focus:ring-[#5F6B38]/10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-zinc-400 hover:text-[#1D1D1D] dark:hover:text-zinc-200 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={1.5} />
                    ) : (
                      <Eye size={16} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
                {isCapsLockOn && (
                  <p className="text-[10px] flex items-center gap-1.5 mt-1 font-semibold text-[#F59E0B] pl-1">
                    <AlertCircle size={10} />
                    <span>Caps Lock is On</span>
                  </p>
                )}
                {passwordError && (
                  <p className="text-[11px] flex items-center gap-1.5 mt-1 font-semibold text-[#EF4444] pl-1">
                    <AlertCircle size={11} />
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[54px] flex items-center justify-center gap-2 bg-[#5F6B38] dark:bg-[#778b46] hover:bg-[#4F5A2F] dark:hover:bg-[#8ba256] text-white text-[15px] font-semibold rounded-[16px] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(95,107,56,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={15} strokeWidth={2} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer Links */}
        <div className="text-center pt-5 border-t border-[#EAE5DA] dark:border-zinc-800 mt-3">
          <p className="text-xs text-[#6B7280] dark:text-zinc-400">
            Join thousands of users running email as an operating system.
          </p>
          <Link
            to="/register"
            onClick={clearError}
            className="text-xs font-semibold text-[#5F6B38] dark:text-[#778b46] hover:underline mt-2 block"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};
