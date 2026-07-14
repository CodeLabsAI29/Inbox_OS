import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from './AuthLayout';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import {
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  User,
} from 'lucide-react';
import { Logo } from './Logo';

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

interface LoginFormProps {
  defaultMode?: 'signin' | 'signup';
}

export const LoginForm: React.FC<LoginFormProps> = ({ defaultMode }) => {
  const {
    loginWithGoogle,
    registerWithGoogle,
    checkGoogleRegistration,
    error: authError,
    clearError,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeMode, setActiveMode] = useState<'signin' | 'signup'>(() => {
    if (defaultMode) return defaultMode;
    if (location.pathname.includes('/register')) return 'signup';
    return 'signin';
  });

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [idToken, setIdToken] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | null
  >(null);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState('CapsLock'));
  };

  const handleModeChange = (mode: 'signin' | 'signup') => {
    setActiveMode(mode);
    setGoogleConnected(false);
    setGoogleEmail('');
    setIdToken('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setUsernameError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setLocalError(null);
    clearError();
    navigate(mode === 'signin' ? '/login' : '/register');
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
        if (activeMode === 'signin') {
          setUsername('demo-user');
        }
      }, 800);
      return;
    }

    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const tokenVal = await result.user.getIdToken();

      const check = await checkGoogleRegistration(tokenVal);
      if (activeMode === 'signin') {
        if (!check.isRegistered) {
          setLocalError(
            'You have not been registered here. Please select the Create Account tab to sign up.'
          );
          return;
        }
        setGoogleConnected(true);
        setGoogleEmail(check.email || result.user.email || '');
        setIdToken(tokenVal);
        setUsername(check.username || '');
      } else {
        if (check.isRegistered) {
          setLocalError(
            'This Google account is already registered. Please select the Sign In tab to sign in.'
          );
          return;
        }
        setGoogleConnected(true);
        setGoogleEmail(result.user.email || '');
        setIdToken(tokenVal);
      }
    } catch (err: any) {
      console.error('Google login popup error:', err);
      setLocalError(err.message || 'Google verification failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!password) return { label: '', score: 0, colorBg: 'transparent' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    if (score <= 2) return { label: 'Weak', score: 1, colorBg: '#EF4444' };
    if (score <= 4) return { label: 'Medium', score: 2, colorBg: '#F59E0B' };
    return { label: 'Strong', score: 3, colorBg: '#10B981' };
  };

  const strength = getPasswordStrength();

  const validate = () => {
    let isValid = true;

    if (activeMode === 'signup') {
      if (!username) {
        setUsernameError('Username is required');
        isValid = false;
      } else if (username.length < 3) {
        setUsernameError('Username must be at least 3 characters');
        isValid = false;
      } else {
        setUsernameError(null);
      }
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (activeMode === 'signup' && password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else {
      setPasswordError(null);
    }

    if (activeMode === 'signup') {
      if (!confirmPassword) {
        setConfirmPasswordError('Please confirm your password');
        isValid = false;
      } else if (password !== confirmPassword) {
        setConfirmPasswordError('Passwords do not match');
        isValid = false;
      } else {
        setConfirmPasswordError(null);
      }
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
      if (activeMode === 'signin') {
        await loginWithGoogle(idToken, username, password);
      } else {
        await registerWithGoogle(idToken, username, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Auth submit error:', err);
      setLocalError(
        err.message ||
          `${activeMode === 'signin' ? 'Login' : 'Registration'} failed.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full space-y-6 text-left">
        {/* Welcome Header */}
        <div className="space-y-2 pb-4 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-gray-150 dark:border-zinc-700/60 shadow-sm flex items-center justify-center">
              <Logo size={42} iconOnly={true} />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#1D1D1D] dark:text-zinc-100 tracking-tight">
            Welcome to InboxOS
          </h3>
          <p className="text-sm text-[#6B7280] dark:text-zinc-400 font-medium">
            Join thousands of users running email as an operating system.
          </p>
        </div>

        {/* Tab Switcher - Equal visual weight paths */}
        <div className="flex w-full bg-[#FAF7F2] dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-[#EAE5DA] dark:border-zinc-700/60 mb-6">
          <button
            type="button"
            onClick={() => handleModeChange('signin')}
            className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-200 uppercase tracking-wider ${
              activeMode === 'signin'
                ? 'bg-white dark:bg-zinc-700 text-[#5F6B38] dark:text-[#778b46] shadow-md border border-[#EAE5DA]/50 dark:border-zinc-650/50'
                : 'text-[#6B7280] dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('signup')}
            className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-200 uppercase tracking-wider ${
              activeMode === 'signup'
                ? 'bg-white dark:bg-zinc-700 text-[#5F6B38] dark:text-[#778b46] shadow-md border border-[#EAE5DA]/50 dark:border-zinc-650/50'
                : 'text-[#6B7280] dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Auth Errors */}
        {(authError || localError) && (
          <div className="flex items-start gap-3 p-4 bg-[#FFF0F0] dark:bg-red-950/20 border border-[#FCA5A5] dark:border-red-900/30 rounded-[14px] text-[#EF4444] dark:text-red-400 text-xs">
            <AlertCircle
              size={16}
              className="shrink-0 text-[#EF4444] dark:text-red-400 mt-0.5"
            />
            <div className="leading-snug font-medium">
              <p>{localError || authError}</p>
              {!googleConnected &&
                localError?.includes('not been registered') && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('signup')}
                    className="underline mt-1.5 text-left font-bold text-[#b91c1c] dark:text-red-400 block"
                  >
                    Create an account now ➔
                  </button>
                )}
              {!googleConnected &&
                localError?.includes('already registered') && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('signin')}
                    className="underline mt-1.5 text-left font-bold text-[#b91c1c] dark:text-red-400 block"
                  >
                    Sign in to your account ➔
                  </button>
                )}
            </div>
          </div>
        )}

        {!googleConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-[#6B7280] dark:text-zinc-400 font-medium">
              {activeMode === 'signin'
                ? 'To sign in, first connect your registered Google account:'
                : 'To sign up, first authenticate with your Google account:'}
            </p>
            <button
              type="button"
              disabled={googleLoading}
              onClick={handleConnectGoogle}
              className="w-full h-[54px] flex items-center justify-center gap-3 bg-white dark:bg-zinc-900 border border-[#EAE5DA] dark:border-zinc-800 rounded-[16px] text-[#1D1D1D] dark:text-zinc-200 text-[15px] font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] hover:bg-[#FAF7F2] dark:hover:bg-zinc-800 disabled:opacity-50 shadow-sm"
            >
              {googleLoading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin text-[#5F6B38] dark:text-[#778b46]"
                  />
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

            {/* Login/Signup details Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username (Pre-filled and disabled for Sign In, editable for Create Account) */}
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
                    onChange={(e) => {
                      if (activeMode === 'signup') {
                        setUsername(e.target.value);
                        if (usernameError) setUsernameError(null);
                      }
                    }}
                    disabled={activeMode === 'signin' || isLoading}
                    className={`w-full h-[54px] pl-11 pr-4 text-[15px] bg-[#FCFCFE] dark:bg-zinc-900 border rounded-[14px] text-[#1D1D1D] dark:text-zinc-200 placeholder-[#9CA3AF] dark:placeholder-zinc-500 outline-none transition-all duration-200 ${
                      activeMode === 'signin'
                        ? 'bg-[#FAF7F2] dark:bg-zinc-900/50 text-[#9CA3AF] dark:text-zinc-500 cursor-not-allowed border-[#EAE5DA] dark:border-zinc-800'
                        : usernameError
                          ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-4 focus:ring-[#EF4444]/10'
                          : 'border-[#EAE5DA] dark:border-zinc-800 focus:border-[#5F6B38] dark:focus:border-[#778b46] focus:ring-4 focus:ring-[#5F6B38]/10'
                    }`}
                    placeholder="choose-username"
                  />
                </div>
                {activeMode === 'signup' && usernameError && (
                  <p className="text-[11px] flex items-center gap-1.5 mt-1 font-semibold text-[#EF4444] pl-1">
                    <AlertCircle size={11} />
                    <span>{usernameError}</span>
                  </p>
                )}
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

                {/* Password Strength Indicator for Create Account */}
                {activeMode === 'signup' && password && (
                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-[#6B7280] dark:text-zinc-400">
                        Password strength:
                      </span>
                      <span style={{ color: strength.colorBg }}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-105 dark:bg-zinc-800 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3].map((val) => (
                        <div
                          key={val}
                          className="h-full flex-1 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor:
                              strength.score >= val
                                ? strength.colorBg
                                : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password for Create Account */}
              {activeMode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#374151] dark:text-zinc-300 tracking-wide block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                      <Lock size={16} strokeWidth={1.5} />
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onKeyDown={handleKeyDown}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) setConfirmPasswordError(null);
                      }}
                      disabled={isLoading}
                      className={`w-full h-[54px] pl-11 pr-12 text-[15px] bg-[#FCFCFE] dark:bg-zinc-900 border rounded-[14px] text-[#1D1D1D] dark:text-zinc-200 placeholder-[#9CA3AF] dark:placeholder-zinc-500 outline-none transition-all duration-200 ${
                        confirmPasswordError
                          ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-4 focus:ring-[#EF4444]/10'
                          : 'border-[#EAE5DA] dark:border-zinc-800 focus:border-[#5F6B38] dark:focus:border-[#778b46] focus:ring-4 focus:ring-[#5F6B38]/10'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-zinc-400 hover:text-[#1D1D1D] dark:hover:text-zinc-200 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} strokeWidth={1.5} />
                      ) : (
                        <Eye size={16} strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <p className="text-[11px] flex items-center gap-1.5 mt-1 font-semibold text-[#EF4444] pl-1">
                      <AlertCircle size={11} />
                      <span>{confirmPasswordError}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[54px] flex items-center justify-center gap-2 bg-[#5F6B38] dark:bg-[#778b46] hover:bg-[#4F5A2F] dark:hover:bg-[#8ba256] text-white text-[15px] font-semibold rounded-[16px] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_25px_rgba(95,107,56,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-4 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {activeMode === 'signin' ? 'Sign In' : 'Create Account'}
                    </span>
                    <ArrowRight size={15} strokeWidth={2} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};
