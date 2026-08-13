import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, MapPin, Siren, Brain, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function SplashPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && session) {
      const role = session.user.app_metadata?.role;
      navigate(role === 'admin' ? '/admin' : '/app', { replace: true });
    }
  }, [loading, session, navigate]);

  const handleEnter = () => {
    if (session) {
      const role = session.user.app_metadata?.role;
      navigate(role === 'admin' ? '/admin' : '/app');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 flex flex-col items-center justify-center overflow-hidden relative">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-teal-500/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-teal-400/10 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-cyan-400/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center animate-zoom-in-95">
        <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl mb-6">
          <Shield className="w-12 h-12 text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">SafeTour AI</h1>
        <p className="text-teal-200 mt-2 text-sm tracking-wide">AI-Powered Tourist Safety Platform</p>
      </div>

      {/* Feature pills */}
      <div className="relative z-10 mt-12 flex flex-wrap gap-3 justify-center px-6 max-w-md animate-fade-in" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
        {[
          { icon: MapPin, label: 'Live GPS' },
          { icon: Brain, label: 'AI Detection' },
          { icon: Siren, label: 'SOS Alerts' },
          { icon: Shield, label: 'Safe Travel' },
        ].map((f) => (
          <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15">
            <f.icon className="w-3.5 h-3.5 text-teal-100" />
            <span className="text-xs text-teal-50 font-medium">{f.label}</span>
          </div>
        ))}
      </div>

      {/* Loading bar */}
      {!showButton && (
        <div className="relative z-10 mt-10 w-48 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-teal-300 rounded-full animate-[loading_2s_ease-in-out]" style={{ width: '100%' }} />
        </div>
      )}

      {/* Enter button */}
      {showButton && (
        <button
          onClick={handleEnter}
          className="relative z-10 mt-10 flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-teal-700 font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all animate-fade-in"
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      <p className="absolute bottom-6 text-xs text-teal-300/60 z-10">
        Powered by Random Forest AI · Capacitor for Android
      </p>

      <style>{`
        @keyframes loading {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
