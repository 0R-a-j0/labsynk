import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Shield, ArrowLeft } from 'lucide-react';
import Logo from '../assets/LabSyncLogo.svg';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const roleInfo = [
        { role: 'Lab Assistant', description: 'Edit inventory, upload syllabus', icon: '🔬' },
        { role: 'HOD', description: 'Full access + user management', icon: '📋' },
        { role: 'Principal', description: 'Highest access level', icon: '🏛️' },
    ];

    return (
        <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundSize: '48px 48px',
                        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
                    }}
                />
                <div className="absolute top-20 left-[10%] w-64 h-64 bg-lab-accent/20 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-20 right-[10%] w-80 h-80 bg-purple-500/15 rounded-full blur-3xl animate-float-slow" />
                <div className="absolute top-1/3 right-1/3 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl animate-float" />
            </div>

            <div className="max-w-md w-full relative z-10">
                {/* Logo */}
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <img src={Logo} alt="LabSync Logo" className="h-6 w-6" />
                        </div>
                        <span className="text-2xl font-extrabold text-white tracking-wider">
                            LAB<span className="text-cyan-300">SYNk</span>
                        </span>
                    </div>
                    <p className="text-white/60 mt-4 text-sm">Staff Login Portal</p>
                </div>

                {/* Login Card */}
                <div className="glass rounded-3xl shadow-glass-lg p-8 animate-fade-in-up" style={{ opacity: 0, animationDelay: '100ms' }}>
                    <div className="flex items-center gap-2.5 mb-6">
                        <div className="bg-lab-primary/10 p-2 rounded-xl">
                            <Shield className="h-5 w-5 text-lab-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 border border-red-100 animate-scale-in">
                            <AlertCircle size={18} />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="login-email">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field !pl-11"
                                    placeholder="you@example.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="login-password">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field !pl-11 !pr-12"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary !py-3.5 text-base disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {/* Role Info */}
                    <div className="mt-8 pt-6 border-t border-gray-200/60">
                        <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Access Levels</p>
                        <div className="space-y-2.5">
                            {roleInfo.map((info, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm bg-gray-50/80 rounded-xl px-3.5 py-2.5">
                                    <span className="flex items-center gap-2">
                                        <span>{info.icon}</span>
                                        <span className="font-medium text-gray-700">{info.role}</span>
                                    </span>
                                    <span className="text-gray-400 text-xs">{info.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Student Access Info */}
                <div className="mt-6 text-center animate-fade-in-up" style={{ opacity: 0, animationDelay: '300ms' }}>
                    <p className="text-white/60 text-sm mb-2">
                        👤 Students can browse without logging in
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-white font-semibold hover:text-cyan-300 text-sm transition-colors"
                    >
                        <ArrowLeft size={14} />
                        Continue as Student
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
