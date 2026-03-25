import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "../../lib/utils"

/**
 * FeatureSteps — scroll-driven step cards with image transitions.
 * Steps progress as the user scrolls through the section.
 *
 * Props
 * ─────
 * features         – array of { step, title?, content, image }
 * className        – wrapper class overrides
 * title            – section heading
 * imageHeight      – Tailwind height class for the image panel
 */
export function FeatureSteps({
    features,
    className,
    title = "How to get Started",
    imageHeight = "h-[400px]",
}) {
    const [currentFeature, setCurrentFeature] = useState(0)
    const sectionRef = useRef(null)

    const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Scroll-driven: track which step the viewport is on
    useEffect(() => {
        const section = sectionRef.current
        if (!section) return

        const handleScroll = () => {
            const rect = section.getBoundingClientRect()
            const sectionHeight = rect.height
            const viewportHeight = window.innerHeight

            // scrollableDistance is the total height of the section minus the viewport height
            const scrollableDistance = rect.height - window.innerHeight

            // Progress is 0 when the top of the section hits the top of the viewport
            // Progress is 1 when the bottom of the section hits the bottom of the viewport
            const scrollProgress = Math.max(0, Math.min(1, -rect.top / scrollableDistance))

            // Map progress to step index
            const stepIndex = Math.min(
                features.length - 1,
                Math.floor(scrollProgress * features.length)
            )

            setCurrentFeature(stepIndex)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll() // initial check

        return () => window.removeEventListener('scroll', handleScroll)
    }, [features.length])

    return (
        <div ref={sectionRef} className={cn("relative", className)} style={{ height: `${features.length * 100}vh` }}>
            <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden p-8 md:p-12 bg-white/50 dark:bg-gray-950/50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto w-full">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-10 text-center text-gray-900 dark:text-white">
                        {title}
                    </h2>

                    <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-10">
                        {/* Step list */}
                        <div className="order-2 md:order-1 space-y-8" role="list">
                            {features.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    className="flex items-center gap-6 md:gap-8 cursor-pointer"
                                    role="listitem"
                                    initial={{ opacity: 0.3 }}
                                    animate={{ opacity: index === currentFeature ? 1 : 0.3 }}
                                    transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
                                    onClick={() => setCurrentFeature(index)}
                                >
                                    {/* Step indicator */}
                                    <motion.div
                                        className={cn(
                                            "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-300",
                                            index === currentFeature
                                                ? "bg-lab-primary dark:bg-lab-accent border-lab-primary dark:border-lab-accent text-white scale-110"
                                                : index < currentFeature
                                                    ? "bg-lab-success border-lab-success text-white"
                                                    : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                                        )}
                                    >
                                        {index < currentFeature ? (
                                            <span className="text-lg font-bold">✓</span>
                                        ) : (
                                            <span className="text-lg font-semibold">{index + 1}</span>
                                        )}
                                    </motion.div>

                                    {/* Step content */}
                                    <div className="flex-1">
                                        <h3 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
                                            {feature.title || feature.step}
                                        </h3>
                                        <p className="text-sm md:text-lg text-gray-500 dark:text-gray-400">
                                            {feature.content}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Image carousel */}
                        <div
                            className={cn(
                                "order-1 md:order-2 relative h-[200px] md:h-[300px] lg:h-[400px] overflow-hidden rounded-2xl shadow-lg",
                                imageHeight
                            )}
                        >
                            <AnimatePresence mode="wait">
                                {features.map(
                                    (feature, index) =>
                                        index === currentFeature && (
                                            <motion.div
                                                key={index}
                                                className="absolute inset-0 rounded-2xl overflow-hidden"
                                                initial={prefersReducedMotion ? {} : { y: 100, opacity: 0, rotateX: -20 }}
                                                animate={{ y: 0, opacity: 1, rotateX: 0 }}
                                                exit={prefersReducedMotion ? {} : { y: -100, opacity: 0, rotateX: 20 }}
                                                transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: "easeInOut" }}
                                            >
                                                <img
                                                    src={feature.image}
                                                    alt={feature.step}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                                {/* Bottom gradient overlay */}
                                                <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-white dark:from-gray-900 via-white/50 dark:via-gray-900/50 to-transparent" />
                                            </motion.div>
                                        )
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div >
    )
}
