import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from './AuthLayout';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowRight
} from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

export const LoginForm: React.FC = () => {
  const { login, error: authError, clearError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Local validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Caps Lock detection state
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const caps = e.getModifierState('CapsLock');
    setIsCapsLockOn(caps);
  };

  const validate = () => {
    let isValid = true;
    
    // Email check
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setEmailError(null);
    }

    // Password check
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    } else {
      setPasswordError(null);
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!validate()) return;

    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full space-y-6">
        
        {/* Welcome Section */}
        <div className="space-y-2 text-left">
          <h3 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Welcome Back <Sparkles size={18} className="text-[#6D5DF6]" />
          </h3>
          <p className="text-xs text-slate-400">
            Sign in to your AI Inbox Operating System.
          </p>
        </div>

        {/* Google Authentication */}
        <button
          type="button"
          onClick={() => {
            // Mock Google SSO click for onboarding presentation
            setIsLoading(true);
            setTimeout(() => {
              setIsLoading(false);
              login('demo@inboxos.dev', 'password123').then(() => navigate('/dashboard'));
            }, 1000);
          }}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-200 text-xs font-bold transition-all hover:bg-white/[0.08] active:scale-[0.98]"
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-white/[0.04]"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">or continue with email</span>
          <div className="flex-grow border-t border-white/[0.04]"></div>
        </div>

        {/* Authentication alerts */}
        {authError && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-left">
            <AlertCircle size={14} className="shrink-0" />
            <p className="leading-snug">{authError}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email Input */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-slate-400">
                <Mail size={15} />
              </span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                disabled={isLoading}
                className={`w-full bg-white/5 border rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-1 ${
                  emailError 
                    ? 'border-rose-500/50 focus:ring-rose-500/10' 
                    : 'border-white/5 hover:border-white/10 focus:border-[#6D5DF6]/40 focus:ring-[#6D5DF6]/10'
                }`}
              />
            </div>
            {emailError && (
              <p className="text-[10px] text-rose-400 flex items-center gap-1.5 mt-1 font-medium pl-1">
                <AlertCircle size={10} />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Password
              </label>
              <a href="#" className="text-[9px] font-bold text-[#6D5DF6] hover:text-[#5B7CFF] transition-colors uppercase tracking-wider">
                Forgot?
              </a>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3 text-slate-400">
                <Lock size={15} />
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
                className={`w-full bg-white/5 border rounded-xl pl-11 pr-12 py-2.5 text-xs text-slate-100 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-1 ${
                  passwordError 
                    ? 'border-rose-500/50 focus:ring-rose-500/10' 
                    : 'border-white/5 hover:border-white/10 focus:border-[#6D5DF6]/40 focus:ring-[#6D5DF6]/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-4 top-3 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {isCapsLockOn && (
              <p className="text-[9px] text-amber-400 flex items-center gap-1.5 mt-1 font-bold pl-1 uppercase">
                <AlertCircle size={9} />
                <span>Warning: Caps Lock is On</span>
              </p>
            )}
            {passwordError && (
              <p className="text-[10px] text-rose-400 flex items-center gap-1.5 mt-1 font-medium pl-1">
                <AlertCircle size={10} />
                <span>{passwordError}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-gradient-to-r from-[#6D5DF6] to-[#5B7CFF] text-white font-bold text-xs transition-all hover:opacity-95 shadow-[0_0_20px_rgba(109,93,246,0.2)] hover:shadow-[0_0_25px_rgba(109,93,246,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-4 uppercase tracking-wider"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>

        </form>

        {/* Footer Toggle */}
        <div className="text-center mt-6 text-[10px] text-slate-500 leading-normal font-semibold">
          <p>Join thousands of users running email as an operating system.</p>
          <Link 
            to="/register" 
            onClick={clearError}
            className="font-bold text-[#6D5DF6] hover:text-[#5B7CFF] transition-colors mt-1 block uppercase tracking-wider"
          >
            Create an Account
          </Link>
        </div>

      </div>
    </AuthLayout>
  );
};
