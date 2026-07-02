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
      <div className="min-h-screen bg-bg-base flex flex-col justify-center items-center select-none relative overflow-hidden">
        {/* ambient background light */}
        <div className="absolute top-[25%] left-[25%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

        {/* glass loader container */}
        <div className="glass rounded-3xl p-8 flex flex-col items-center gap-4 border border-white/5 backdrop-blur-2xl shadow-xl max-w-[280px] w-full text-center">
          <Loader2 size={36} className="text-accent animate-spin" />
          <div>
            <p className="text-sm font-semibold text-white">
              Initializing InboxOS
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              Securing connection channel...
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
