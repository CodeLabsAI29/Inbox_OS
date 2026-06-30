import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from './AuthLayout';
import { 
  UserCheck, 
  Mail, 
  Lock, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowRight 
} from 'lucide-react';

export const RegisterForm: React.FC = () => {
  const { register, error: authError, clearError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Local validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  // Caps Lock detection state
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const caps = e.getModifierState('CapsLock');
    setIsCapsLockOn(caps);
  };

  // Password strength calculator
  const getPasswordStrength = () => {
    if (!password) return { label: '', score: 0, color: 'bg-transparent' };
    
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) {
      return { label: 'Weak', score: 1, color: 'bg-rose-500' };
    } else if (score <= 4) {
      return { label: 'Medium', score: 2, color: 'bg-amber-500' };
    } else {
      return { label: 'Strong', score: 3, color: 'bg-emerald-500' };
    }
  };

  const strength = getPasswordStrength();

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

    // Confirm password check
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    } else {
      setConfirmPasswordError(null);
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!validate()) return;

    setIsLoading(true);
    try {
      await register(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
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
            Create Account <UserCheck size={18} className="text-[#6D5DF6]" />
          </h3>
          <p className="text-xs text-slate-400">
            Get started with your AI email operating system.
          </p>
        </div>

        {/* Global authentication alerts */}
        {authError && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-left animate-shake">
            <AlertCircle size={14} className="shrink-0" />
            <p className="leading-snug">{authError}</p>
          </div>
        )}

        {/* Register Form */}
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
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-slate-400">
                <Lock size={15} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
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

            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-1 mt-2">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                  <span>Strength: {strength.label}</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                  <div className={`h-full flex-1 rounded-l transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                  <div className={`h-full flex-1 transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                  <div className={`h-full flex-1 rounded-r transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                </div>
              </div>
            )}

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

          {/* Confirm Password Input */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-slate-400">
                <Lock size={15} />
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onKeyDown={handleKeyDown}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError(null);
                }}
                disabled={isLoading}
                className={`w-full bg-white/5 border rounded-xl pl-11 pr-12 py-2.5 text-xs text-slate-100 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-1 ${
                  confirmPasswordError 
                    ? 'border-rose-500/50 focus:ring-rose-500/10' 
                    : 'border-white/5 hover:border-white/10 focus:border-[#6D5DF6]/40 focus:ring-[#6D5DF6]/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                className="absolute right-4 top-3 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirmPasswordError && (
              <p className="text-[10px] text-rose-400 flex items-center gap-1.5 mt-1 font-medium pl-1">
                <AlertCircle size={10} />
                <span>{confirmPasswordError}</span>
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
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>

        </form>

        {/* Footer Toggle */}
        <div className="text-center mt-6 text-[10px] text-slate-500 leading-normal font-semibold">
          <p>Join thousands of users running email as an operating system.</p>
          <Link 
            to="/login" 
            onClick={clearError}
            className="font-bold text-[#6D5DF6] hover:text-[#5B7CFF] transition-colors mt-1 block uppercase tracking-wider"
          >
            Sign In
          </Link>
        </div>

      </div>
    </AuthLayout>
  );
};
