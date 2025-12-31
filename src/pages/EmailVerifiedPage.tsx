import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CheckCircle, AlertCircle, Home, Sparkles } from 'lucide-react';

type PageState = 'loading' | 'success' | 'error';

export default function EmailVerifiedPage() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const starsRef = useRef<HTMLDivElement>(null);

  // Check for valid session on mount (Supabase handles token exchange automatically)
  useEffect(() => {
    const verifyEmail = async () => {
      if (!supabase) {
        setPageState('error');
        setError('Unable to connect to authentication service');
        return;
      }

      try {
        // Supabase automatically handles the token exchange from the URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setPageState('error');
          setError('This verification link has expired or is invalid. Please try signing up again.');
          return;
        }

        if (!session) {
          setPageState('error');
          setError('This verification link has expired or is invalid. Please try signing up again.');
          return;
        }

        // Get user name for personalized greeting
        const firstName = session.user.user_metadata?.first_name ||
                          session.user.user_metadata?.full_name?.split(' ')[0] || '';
        setUserName(firstName);
        setPageState('success');
      } catch (err) {
        setPageState('error');
        setError('Something went wrong. Please try signing up again.');
      }
    };

    verifyEmail();
  }, []);

  // Generate stars background
  useEffect(() => {
    const container = starsRef.current;
    if (!container) return;

    for (let i = 0; i < 50; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.cssText = `
        position: absolute;
        width: 2px;
        height: 2px;
        background: white;
        border-radius: 50%;
        opacity: 0.4;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: twinkle 3s ease-in-out infinite;
        animation-delay: ${Math.random() * 3}s;
      `;
      container.appendChild(star);
    }

    return () => {
      container.innerHTML = '';
    };
  }, []);

  // Auto-redirect after success
  useEffect(() => {
    if (pageState === 'success') {
      const timer = setTimeout(() => {
        navigate('/');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [pageState, navigate]);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      {/* Stars background */}
      <div ref={starsRef} className="fixed inset-0 z-0 overflow-hidden" />

      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-transparent to-purple-950/20 z-0" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Card */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8">
          {/* Loading State */}
          {pageState === 'loading' && (
            <div className="py-8">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white" />
              </div>
              <p className="text-white/60 text-sm">Verifying your email...</p>
            </div>
          )}

          {/* Error State */}
          {pageState === 'error' && (
            <div className="py-4">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Verification Failed</h2>
              <p className="text-sm text-white/50 mb-6">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium text-sm hover:from-cyan-400 hover:to-purple-500 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20"
              >
                Go to Homepage
              </button>
            </div>
          )}

          {/* Success State */}
          {pageState === 'success' && (
            <div className="py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                {userName ? `Welcome, ${userName}!` : 'Email Verified!'}
              </h2>
              <p className="text-sm text-white/50 mb-6">
                Your account is now active. You're all set to start creating personalized meditations.
              </p>

              {/* Feature highlights */}
              <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">What you can do now:</span>
                </div>
                <ul className="space-y-2 text-sm text-white/60">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    Create AI-powered meditations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    Clone your voice for personalized audio
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Save unlimited meditations to your library
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium text-sm hover:from-cyan-400 hover:to-purple-500 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Start Creating
              </button>

              <p className="mt-4 text-xs text-white/30">
                Redirecting automatically in 5 seconds...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Keyframes for star animation */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
