import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link as LinkIcon, Zap } from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

export default function RadialOrbitalTimeline({ timelineData }) {
    const [expandedItems, setExpandedItems] = useState({});
    const [rotationAngle, setRotationAngle] = useState(0);
    const [autoRotate, setAutoRotate] = useState(true);
    const [pulseEffect, setPulseEffect] = useState({});
    const [centerOffset] = useState({ x: 0, y: 0 });
    const [activeNodeId, setActiveNodeId] = useState(null);
    const containerRef = useRef(null);
    const orbitRef = useRef(null);
    const nodeRefs = useRef({});

    const handleContainerClick = (e) => {
        if (e.target === containerRef.current || e.target === orbitRef.current) {
            setExpandedItems({});
            setActiveNodeId(null);
            setPulseEffect({});
            setAutoRotate(true);
        }
    };

    const toggleItem = (id) => {
        setExpandedItems((prev) => {
            const newState = { ...prev };
            Object.keys(newState).forEach((key) => {
                if (parseInt(key) !== id) {
                    newState[parseInt(key)] = false;
                }
            });

            newState[id] = !prev[id];

            if (!prev[id]) {
                setActiveNodeId(id);
                setAutoRotate(false);

                const relatedItems = getRelatedItems(id);
                const newPulseEffect = {};
                relatedItems.forEach((relId) => {
                    newPulseEffect[relId] = true;
                });
                setPulseEffect(newPulseEffect);

                centerViewOnNode(id);
            } else {
                setActiveNodeId(null);
                setAutoRotate(true);
                setPulseEffect({});
            }

            return newState;
        });
    };

    useEffect(() => {
        let rotationTimer;

        // Check reduced motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        if (autoRotate) {
            rotationTimer = setInterval(() => {
                setRotationAngle((prev) => {
                    const newAngle = (prev + 0.3) % 360;
                    return Number(newAngle.toFixed(3));
                });
            }, 50);
        }

        return () => {
            if (rotationTimer) {
                clearInterval(rotationTimer);
            }
        };
    }, [autoRotate]);

    const centerViewOnNode = (nodeId) => {
        if (!nodeRefs.current[nodeId]) return;

        const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
        const totalNodes = timelineData.length;
        const targetAngle = (nodeIndex / totalNodes) * 360;

        setRotationAngle(270 - targetAngle);
    };

    const calculateNodePosition = (index, total) => {
        const angle = ((index / total) * 360 + rotationAngle) % 360;
        const radius = 200;
        const radian = (angle * Math.PI) / 180;

        const x = radius * Math.cos(radian) + centerOffset.x;
        const y = radius * Math.sin(radian) + centerOffset.y;

        const zIndex = Math.round(100 + 50 * Math.cos(radian));
        const opacity = Math.max(
            0.4,
            Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
        );

        return { x, y, angle, zIndex, opacity };
    };

    const getRelatedItems = (itemId) => {
        const currentItem = timelineData.find((item) => item.id === itemId);
        return currentItem ? currentItem.relatedIds : [];
    };

    const isRelatedToActive = (itemId) => {
        if (!activeNodeId) return false;
        const relatedItems = getRelatedItems(activeNodeId);
        return relatedItems.includes(itemId);
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case "completed":
                return "text-white bg-lab-primary border-lab-primary";
            case "in-progress":
                return "text-white bg-lab-accent border-lab-accent";
            case "pending":
                return "text-gray-400 bg-gray-800/60 border-gray-600";
            default:
                return "text-gray-400 bg-gray-800/60 border-gray-600";
        }
    };

    return (
        <section
            className="w-full flex flex-col items-center justify-center overflow-hidden relative"
            ref={containerRef}
            onClick={handleContainerClick}
            style={{ height: '600px' }}
            aria-label="Project timeline visualization"
        >
            <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
                <div
                    className="absolute w-full h-full flex items-center justify-center"
                    ref={orbitRef}
                    style={{
                        perspective: "1000px",
                        transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
                    }}
                >
                    {/* Center nucleus */}
                    <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-lab-primary via-lab-secondary to-lab-accent animate-pulse flex items-center justify-center z-10">
                        <div className="absolute w-20 h-20 rounded-full border border-lab-accent/20 animate-ping opacity-70" />
                        <div
                            className="absolute w-24 h-24 rounded-full border border-lab-accent/10 animate-ping opacity-50"
                            style={{ animationDelay: "0.5s" }}
                        />
                        <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-md" />
                    </div>

                    {/* Orbital ring */}
                    <div className="absolute w-96 h-96 rounded-full border border-gray-300/20 dark:border-white/10" />

                    {timelineData.map((item, index) => {
                        const position = calculateNodePosition(index, timelineData.length);
                        const isExpanded = expandedItems[item.id];
                        const isRelated = isRelatedToActive(item.id);
                        const isPulsing = pulseEffect[item.id];
                        const Icon = item.icon;

                        const nodeStyle = {
                            transform: `translate(${position.x}px, ${position.y}px)`,
                            zIndex: isExpanded ? 200 : position.zIndex,
                            opacity: isExpanded ? 1 : position.opacity,
                        };

                        return (
                            <div
                                key={item.id}
                                ref={(el) => (nodeRefs.current[item.id] = el)}
                                className="absolute transition-all duration-700 cursor-pointer"
                                style={nodeStyle}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(item.id);
                                }}
                            >
                                {/* Energy aura */}
                                <div
                                    className={`absolute rounded-full -inset-1 ${isPulsing ? "animate-pulse duration-1000" : ""
                                        }`}
                                    style={{
                                        background: `radial-gradient(circle, rgba(0,153,204,0.2) 0%, rgba(0,153,204,0) 70%)`,
                                        width: `${item.energy * 0.5 + 40}px`,
                                        height: `${item.energy * 0.5 + 40}px`,
                                        left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                                        top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                                    }}
                                />

                                {/* Node */}
                                <div
                                    className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${isExpanded
                                            ? "bg-lab-accent text-white"
                                            : isRelated
                                                ? "bg-lab-accent/50 text-white"
                                                : "bg-white dark:bg-gray-900 text-lab-primary dark:text-lab-accent"
                                        }
                  border-2 
                  ${isExpanded
                                            ? "border-lab-accent shadow-lg shadow-lab-accent/30"
                                            : isRelated
                                                ? "border-lab-accent animate-pulse"
                                                : "border-gray-300 dark:border-gray-600"
                                        }
                  transition-all duration-300 transform
                  ${isExpanded ? "scale-150" : ""}
                `}
                                >
                                    <Icon size={16} />
                                </div>

                                {/* Label */}
                                <div
                                    className={`
                  absolute top-12 whitespace-nowrap
                  text-xs font-semibold tracking-wider
                  transition-all duration-300
                  ${isExpanded ? "text-lab-primary dark:text-lab-accent-light scale-125" : "text-gray-500 dark:text-gray-400"}
                `}
                                >
                                    {item.title}
                                </div>

                                {/* Expanded card */}
                                {isExpanded && (
                                    <Card className="absolute top-20 left-1/2 -translate-x-1/2 w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-gray-200 dark:border-gray-700 shadow-xl overflow-visible">
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-lab-accent/50" />
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-center">
                                                <Badge
                                                    className={`px-2 text-xs ${getStatusStyles(item.status)}`}
                                                >
                                                    {item.status === "completed"
                                                        ? "COMPLETE"
                                                        : item.status === "in-progress"
                                                            ? "IN PROGRESS"
                                                            : "PENDING"}
                                                </Badge>
                                                <span className="text-xs font-mono text-gray-400">
                                                    {item.date}
                                                </span>
                                            </div>
                                            <CardTitle className="text-sm mt-2 text-gray-900 dark:text-white">
                                                {item.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-xs text-gray-600 dark:text-gray-300">
                                            <p>{item.content}</p>

                                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex justify-between items-center text-xs mb-1">
                                                    <span className="flex items-center">
                                                        <Zap size={10} className="mr-1" />
                                                        Energy Level
                                                    </span>
                                                    <span className="font-mono">{item.energy}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-lab-primary to-lab-accent"
                                                        style={{ width: `${item.energy}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {item.relatedIds.length > 0 && (
                                                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="flex items-center mb-2">
                                                        <LinkIcon size={10} className="text-gray-400 mr-1" />
                                                        <h4 className="text-xs uppercase tracking-wider font-medium text-gray-400">
                                                            Connected Nodes
                                                        </h4>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.relatedIds.map((relatedId) => {
                                                            const relatedItem = timelineData.find(
                                                                (i) => i.id === relatedId
                                                            );
                                                            return (
                                                                <Button
                                                                    key={relatedId}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="flex items-center h-6 px-2 py-0 text-xs rounded-md border-gray-200 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-lab-primary transition-all cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleItem(relatedId);
                                                                    }}
                                                                >
                                                                    {relatedItem?.title}
                                                                    <ArrowRight
                                                                        size={8}
                                                                        className="ml-1 text-gray-400"
                                                                    />
                                                                </Button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
