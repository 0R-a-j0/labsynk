import React from 'react';
import { Link } from 'react-router-dom';
import {
    Beaker, Layers, Calendar, BookOpen, FileText, Bot,
    ArrowRight, Sparkles, Zap, Globe, ChevronRight
} from 'lucide-react';

const Home = () => {
    const features = [
        {
            icon: Layers,
            title: 'Inventory Tracking',
            description: 'Real-time component availability. Search for equipment across labs instantly.',
            link: '/inventory',
            color: 'from-indigo-500 to-violet-600',
            iconBg: 'bg-indigo-100 text-indigo-600',
        },
        {
            icon: Calendar,
            title: 'Smart Scheduling',
            description: 'Conflict-free lab bookings. View timetables by semester and branch.',
            link: '/schedule',
            color: 'from-violet-500 to-purple-600',
            iconBg: 'bg-violet-100 text-violet-600',
        },
        {
            icon: FileText,
            title: 'AI Syllabus Parser',
            description: 'Upload PDFs and let AI extract experiments, map simulations automatically.',
            link: '/syllabus',
            color: 'from-cyan-500 to-blue-600',
            iconBg: 'bg-cyan-100 text-cyan-600',
        },
        {
            icon: BookOpen,
            title: 'Virtual Labs',
            description: 'Access vLabs IIT Bombay simulations directly linked to your syllabus.',
            link: '/labs',
            color: 'from-teal-500 to-emerald-600',
            iconBg: 'bg-teal-100 text-teal-600',
        },
        {
            icon: Bot,
            title: 'AI Assistant',
            description: 'Get instant help with experiments, theory, and lab navigation.',
            link: '/assist',
            color: 'from-pink-500 to-rose-600',
            iconBg: 'bg-pink-100 text-pink-600',
        },
    ];

    const stats = [
        { label: 'Virtual Experiments', value: '500+', icon: Beaker },
        { label: 'AI-Powered', value: '100%', icon: Sparkles },
        { label: 'Lab Coverage', value: 'Full', icon: Globe },
        { label: 'Real-Time', value: 'Sync', icon: Zap },
    ];

    return (
        <div>
            {/* ===== Hero Section ===== */}
            <section
                className="relative overflow-hidden bg-hero-gradient min-h-[800px]"
                style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }}
            >
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                    {/* Grid overlay */}
                    <div className="absolute inset-0"
                        style={{
                            backgroundSize: '48px 48px',
                            backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
                        }}
                    />
                    {/* Floating orbs */}
                    <div className="absolute top-24 left-[10%] w-80 h-80 bg-lab-accent/20 rounded-full blur-3xl animate-float" />
                    <div className="absolute bottom-24 right-[15%] w-[28rem] h-[28rem] bg-purple-500/15 rounded-full blur-3xl animate-float-slow" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-lab-accent/5 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pt-16 md:pt-24 pb-40 md:pb-52">
                    <div className="max-w-3xl">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2.5 mb-10 animate-fade-in">
                            <Sparkles size={16} className="text-lab-accent-light" />
                            <span className="text-sm sm:text-base text-white/90 font-medium">The Smart Lab Ecosystem</span>
                        </div>

                        {/* Heading */}
                        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[1.08] mb-8 animate-fade-in-up">
                            Your Labs,{' '}
                            <span className="relative">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-lab-accent-light via-cyan-300 to-lab-accent">
                                    Reimagined
                                </span>
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-xl sm:text-2xl text-white/70 max-w-2xl mb-12 leading-relaxed animate-fade-in-up delay-200" style={{ opacity: 0 }}>
                            Manage inventory, schedule labs, parse syllabi with AI, and access
                            virtual simulations — all from one intelligent platform.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-4 animate-fade-in-up delay-300" style={{ opacity: 0 }}>
                            <Link
                                to="/inventory"
                                className="group inline-flex items-center gap-2.5 bg-white text-lab-primary font-bold px-10 py-5 rounded-2xl text-lg
                                           hover:bg-lab-accent-light hover:text-white transition-all duration-300
                                           shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-lab-accent/30"
                            >
                                Explore Labs
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-sm text-white font-semibold px-10 py-5 rounded-2xl text-lg
                                           border border-white/20 hover:bg-white/20 transition-all duration-300"
                            >
                                Staff Login
                                <ChevronRight size={20} />
                            </Link>
                        </div>
                    </div>

                    {/* Stats Bar - Moved inside hero */}
                    <div className="mt-20 max-w-5xl">
                        <div className="glass rounded-2xl p-1 shadow-glass-lg backdrop-blur-md bg-white/5 border border-white/10">
                            <div className="grid grid-cols-2 md:grid-cols-4">
                                {stats.map((stat, i) => (
                                    <div
                                        key={stat.label}
                                        className={`flex items-center gap-3 p-5 ${i < stats.length - 1 ? 'md:border-r border-white/10' : ''
                                            } animate-fade-in-up`}
                                        style={{ opacity: 0, animationDelay: `${400 + i * 100}ms` }}
                                    >
                                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                                            <stat.icon size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-white">{stat.value}</div>
                                            <div className="text-xs text-white/60">{stat.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>


            </section>

            {/* ===== Features Section ===== */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        Everything Your Lab Needs
                    </h2>
                    <p className="text-lg text-lab-muted max-w-2xl mx-auto">
                        A unified platform that bridges physical lab management with digital learning resources.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, i) => (
                        <Link
                            key={feature.title}
                            to={feature.link}
                            className="glass-card group p-6 animate-fade-in-up block"
                            style={{ opacity: 0, animationDelay: `${i * 100}ms` }}
                        >
                            <div className={`${feature.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                <feature.icon size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-lab-primary transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-gray-500 text-sm leading-relaxed mb-4">
                                {feature.description}
                            </p>
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-lab-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                Explore <ArrowRight size={14} />
                            </span>
                        </Link>
                    ))}
                </div>
            </section >

            {/* ===== CTA Section ===== */}
            < section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24" >
                <div className="relative overflow-hidden bg-gradient-to-r from-lab-primary via-lab-secondary to-lab-accent rounded-3xl p-12 md:p-16 text-center">
                    {/* Background decoration */}
                    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-2xl" />
                        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-lab-accent-light/10 rounded-full blur-2xl" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Ready to Modernize Your Lab?
                        </h2>
                        <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">
                            Students can browse freely. Staff members can log in to manage inventory,
                            schedules, and AI-powered syllabus tools.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link
                                to="/inventory"
                                className="group inline-flex items-center gap-2 bg-white text-lab-primary font-bold px-8 py-4 rounded-2xl
                                           hover:bg-gray-100 transition-all duration-300 shadow-lg"
                            >
                                Browse as Student
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 bg-white/10 text-white font-semibold px-8 py-4 rounded-2xl
                                           border border-white/20 hover:bg-white/20 transition-all duration-300"
                            >
                                Staff Login
                            </Link>
                        </div>
                    </div>
                </div>
            </section >
        </div >
    );
};

export default Home;
