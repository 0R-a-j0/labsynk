import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layers, Calendar, BookOpen, FileText, Bot, Shield, LogIn, LogOut, User, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/LabSyncLogo.svg';

const Layout = () => {
    const { user, isAuthenticated, canAccessAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Detect scroll for navbar shadow
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navLinks = [
        { to: '/inventory', icon: Layers, text: 'Inventory' },
        { to: '/schedule', icon: Calendar, text: 'Schedule' },
        { to: '/syllabus', icon: FileText, text: 'Syllabus AI' },
        { to: '/labs', icon: BookOpen, text: 'Virtual Labs' },
        { to: '/assist', icon: Bot, text: 'Assistant' },
    ];

    return (
        <div className="min-h-screen bg-lab-bg text-gray-800 font-sans flex flex-col">
            {/* Grid Overlay */}
            <div className="absolute inset-0 lab-grid pointer-events-none z-0" aria-hidden="true"></div>

            {/* ===== Navbar ===== */}
            <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
                ? 'glass shadow-glass-lg'
                : 'bg-white/60 backdrop-blur-md border-b border-gray-200/50'
                }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2.5 group">
                            <img src={Logo} alt="LabSync Logo" className="h-10 w-10 group-hover:scale-105 transition-transform duration-300" />
                            <span className="text-xl font-bold text-lab-primary">
                                LAB<span className="text-sky-500">SYNk</span>
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    icon={<link.icon size={16} />}
                                    text={link.text}
                                    active={location.pathname === link.to}
                                />
                            ))}
                            {canAccessAdmin() && (
                                <NavLink
                                    to="/admin"
                                    icon={<Shield size={16} />}
                                    text="Admin"
                                    active={location.pathname === '/admin'}
                                    highlight
                                />
                            )}

                            {/* Auth Section */}
                            <div className="flex items-center gap-2 border-l border-gray-200/80 pl-4 ml-2">
                                {isAuthenticated() ? (
                                    <>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-lab-success/10 text-lab-success rounded-full text-xs font-semibold">
                                            <User size={14} />
                                            <span className="capitalize">{user?.role}</span>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-lab-danger hover:bg-lab-danger/5 rounded-lg text-sm transition-colors"
                                        >
                                            <LogOut size={14} />
                                            <span className="hidden lg:inline">Logout</span>
                                        </button>
                                    </>
                                ) : (
                                    <Link
                                        to="/login"
                                        className="flex items-center gap-2 btn-primary !px-4 !py-2 !rounded-xl text-sm"
                                    >
                                        <LogIn size={14} />
                                        Staff Login
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
                            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                        >
                            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                {/* ===== Mobile Menu Drawer ===== */}
                {mobileOpen && (
                    <div className="md:hidden absolute top-16 inset-x-0 glass shadow-glass-lg animate-fade-in-down">
                        <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${location.pathname === link.to
                                        ? 'bg-lab-primary/10 text-lab-primary'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-lab-primary'
                                        }`}
                                >
                                    <link.icon size={18} />
                                    {link.text}
                                </Link>
                            ))}
                            {canAccessAdmin() && (
                                <Link
                                    to="/admin"
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${location.pathname === '/admin'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'text-amber-600 hover:bg-amber-50'
                                        }`}
                                >
                                    <Shield size={18} />
                                    Admin
                                </Link>
                            )}

                            <div className="pt-3 mt-3 border-t border-gray-200/80">
                                {isAuthenticated() ? (
                                    <div className="flex items-center justify-between px-4 py-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <User size={16} className="text-lab-success" />
                                            <span className="font-medium capitalize text-gray-700">{user?.role}</span>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-lab-danger bg-lab-danger/5 rounded-lg text-sm font-medium"
                                        >
                                            <LogOut size={14} />
                                            Logout
                                        </button>
                                    </div>
                                ) : (
                                    <Link
                                        to="/login"
                                        className="flex items-center justify-center gap-2 btn-primary w-full text-sm"
                                    >
                                        <LogIn size={16} />
                                        Staff Login
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* ===== Main Content ===== */}
            <main className="relative z-10 flex-grow">
                <Outlet />
            </main>

            {/* ===== Footer ===== */}
            <footer className="relative z-10 border-t border-gray-200/60 mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <img src={Logo} alt="LabSync Logo" className="h-8 w-8 grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all" />
                            <span className="text-lg font-bold text-lab-primary">LAB<span className="text-sky-600">SYNk</span></span>
                        </div>
                        <p className="text-sm text-lab-muted">
                            © 2026 LABSYNk. Built for engineering colleges.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const NavLink = ({ to, icon, text, active, highlight }) => (
    <Link
        to={to}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${active
            ? highlight
                ? 'bg-amber-100 text-amber-700 shadow-sm'
                : 'bg-lab-primary/10 text-lab-primary shadow-sm'
            : highlight
                ? 'text-amber-600 hover:bg-amber-50'
                : 'text-gray-500 hover:text-lab-primary hover:bg-lab-primary/5'
            }`}
    >
        {icon}
        <span>{text}</span>
    </Link>
);

export default Layout;
