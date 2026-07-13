import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col justify-center items-center select-none"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="neu-card p-8 flex flex-col items-center gap-4 max-w-[280px] w-full text-center">
          <Loader2
            size={36}
            className="animate-spin"
            style={{ color: 'var(--color-ink)' }}
          />
          <div>
            <p
              className="text-sm font-black uppercase tracking-wider"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-ink)',
              }}
            >
              Initializing OS
            </p>
            <p
              className="text-[10px] mt-1 font-bold"
              style={{ color: '#666', fontFamily: 'var(--font-body)' }}
            >
              Securing connection...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
