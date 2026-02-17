/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'lab-bg': '#F5F7FF',
                'lab-surface': '#FFFFFF',
                'lab-primary': '#2A1B75',
                'lab-secondary': '#4834A6',
                'lab-accent': '#0099CC',
                'lab-accent-light': '#00D4FF',
                'lab-success': '#10B981',
                'lab-warning': '#F59E0B',
                'lab-danger': '#EF4444',
                'lab-muted': '#94A3B8',
                'lab-card': 'rgba(255, 255, 255, 0.7)',
            },
            fontFamily: {
                'sans': ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.6s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
                'fade-in-down': 'fadeInDown 0.5s ease-out forwards',
                'slide-in-left': 'slideInLeft 0.5s ease-out forwards',
                'slide-in-right': 'slideInRight 0.5s ease-out forwards',
                'float': 'float 6s ease-in-out infinite',
                'float-slow': 'float 8s ease-in-out infinite',
                'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
                'gradient-shift': 'gradientShift 8s ease infinite',
                'bounce-dot': 'bounceDot 1.4s infinite ease-in-out both',
                'scale-in': 'scaleIn 0.3s ease-out forwards',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(24px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeInDown: {
                    '0%': { opacity: '0', transform: 'translateY(-16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-24px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(24px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-12px)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(42, 27, 117, 0.15)' },
                    '50%': { boxShadow: '0 0 40px rgba(42, 27, 117, 0.3)' },
                },
                gradientShift: {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                },
                bounceDot: {
                    '0%, 80%, 100%': { transform: 'scale(0)' },
                    '40%': { transform: 'scale(1)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'hero-gradient': 'linear-gradient(135deg, #2A1B75 0%, #4834A6 40%, #0099CC 100%)',
                'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(245,247,255,0.8) 100%)',
            },
            boxShadow: {
                'glass': '0 8px 32px rgba(42, 27, 117, 0.08)',
                'glass-lg': '0 16px 48px rgba(42, 27, 117, 0.12)',
                'glow': '0 0 24px rgba(0, 153, 204, 0.2)',
                'glow-primary': '0 0 24px rgba(42, 27, 117, 0.2)',
                'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(42, 27, 117, 0.06)',
                'card-hover': '0 4px 16px rgba(42, 27, 117, 0.12), 0 8px 32px rgba(0, 153, 204, 0.08)',
            },
            backdropBlur: {
                'xs': '2px',
            },
        },
    },
    plugins: [],
}
