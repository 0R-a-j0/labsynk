import { useEffect, useRef, createContext, useContext } from 'react';
import Lenis from 'lenis';

const LenisContext = createContext(null);

export const useLenis = () => useContext(LenisContext);

/**
 * Wraps the app in Lenis smooth scrolling.
 * Respects prefers-reduced-motion — disables smooth scroll if user prefers reduced motion.
 */
export function LenisProvider({ children }) {
    const lenisRef = useRef(null);

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smooth: true,
            smoothTouch: false,
        });
        lenisRef.current = lenis;

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
            lenisRef.current = null;
        };
    }, []);

    return (
        <LenisContext.Provider value={lenisRef}>
            {children}
        </LenisContext.Provider>
    );
}
