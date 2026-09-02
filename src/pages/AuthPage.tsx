import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Mail, Lock, User, Phone, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/app');
      }
    } else {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, phone);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        navigate('/app');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel */}
      <div className="lg:w-1/2 bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-teal-400 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SafeTour AI</h1>
              <p className="text-xs text-teal-200">Intelligent Tourist Safety</p>
            </div>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
            Travel with confidence.
            <br />
            We watch over you.
          </h2>
          <p className="text-teal-100 text-base leading-relaxed max-w-md">
            AI-powered safety detection monitors your location and movement in real time.
            If something seems wrong, we alert your contacts and authorities automatically.
          </p>
        </div>
        <div className="relative z-10 mt-12 space-y-3">
          <Feature text="Live GPS tracking with Google Maps" />
          <Feature text="AI emergency detection (Random Forest)" />
          <Feature text="Automatic alerts to contacts & authorities" />
          <Feature text="Nearby hospitals, police & emergency services" />
        </div>
      </div>

      {/* Right form panel */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-slate-500 mt-1">
              {mode === 'login'
                ? 'Sign in to access your safety dashboard'
                : 'Join SafeTour AI and travel safer'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <Input
                  label="Full Name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  icon={<User className="w-4 h-4" />}
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 1234"
                  icon={<Phone className="w-4 h-4" />}
                />
              </>
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              icon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              icon={<Lock className="w-4 h-4" />}
            />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-teal-600 font-semibold hover:text-teal-700 transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <div className="mt-8 p-4 rounded-xl bg-teal-50 border border-teal-200">
            <p className="text-xs text-teal-800 leading-relaxed">
              <strong>Demo Admin Access:</strong> Admin accounts are created via database.
              Sign up as a tourist to explore the full safety features.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-teal-50">
      <div className="w-5 h-5 rounded-full bg-teal-400/30 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-teal-300" />
      </div>
      <span className="text-sm">{text}</span>
    </div>
  );
}
