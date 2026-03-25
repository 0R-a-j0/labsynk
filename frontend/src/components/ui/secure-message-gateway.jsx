import React, { useState } from "react";
import { Send, Terminal, PlusIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export function CreateCorners({ children }) {
    const positions = [
        "top-0 -left-3",
        "top-0 -right-3",
        "bottom-0 -left-3",
        "bottom-0 -right-3",
    ];

    return (
        <div className="absolute z-10 inset-0 pointer-events-none">
            {positions.map((pos, index) => (
                <section key={index} className={`absolute ${pos}`}>
                    {children}
                </section>
            ))}
        </div>
    );
}

export const SecureMessageGateway = () => {
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState("");

    function handleSubmit(e) {
        e.preventDefault();
        if (!message.trim() || pending) return;

        setPending(true);
        setTimeout(() => {
            setPending(false);
            setMessage("");
        }, 2000);
    }

    return (
        <div className="flex items-center justify-center min-h-[300px] w-full p-4">
            <div className="relative w-full max-w-2xl bg-transparent border border-gray-300 dark:border-gray-700 border-dashed shadow-sm p-6 sm:p-10 transition-all rounded-none">

                <CreateCorners>
                    <PlusIcon className="font-[200] text-lab-accent" />
                </CreateCorners>

                {/* Diagonal Fade Grid Background - Top Left */}
                <div className="min-h-full z-0 w-full bg-transparent absolute top-0 left-0 pointer-events-none">
                    <div
                        className="absolute inset-0 z-0"
                        style={{
                            backgroundImage: `
                linear-gradient(to right, rgba(148, 163, 184, 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(148, 163, 184, 0.3) 1px, transparent 1px)
              `,
                            backgroundSize: "32px 32px",
                            WebkitMaskImage:
                                "radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)",
                            maskImage:
                                "radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)",
                        }}
                    />
                </div>

                <div className="backdrop-blur-xs p-2 rounded-xs relative z-10">
                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-[0.6rem] font-bold uppercase tracking-[0.2em] mb-1 flex border-b border-b-lab-accent pb-2 items-center gap-2">
                            <div className="size-1.5 bg-lab-accent rounded-full animate-pulse" aria-hidden="true" />
                            <span className="text-lab-accent">Lab Terminal</span>
                        </h2>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                            <span className="text-lab-accent">Send Feedback</span> to LABSYNk
                        </h3>
                    </div>

                    {/* Input & Button */}
                    <form onSubmit={handleSubmit} className="flex sm:flex-row items-stretch gap-2" role="search">
                        <div className="relative flex-1 group">
                            {/* Corner decorators on focus */}
                            <div className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t-2 border-l-2 border-lab-primary dark:border-lab-accent opacity-0 group-focus-within:opacity-100 transition-all z-10" />
                            <div className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b-2 border-r-2 border-lab-primary dark:border-lab-accent opacity-0 group-focus-within:opacity-100 transition-all z-10" />

                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-lab-primary dark:group-focus-within:text-lab-accent transition-colors z-10">
                                <Terminal size={14} />
                            </div>

                            <input
                                type="text"
                                autoComplete="off"
                                placeholder="ENTER MESSAGE >>"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={pending}
                                className={cn(
                                    "w-full bg-gray-100/50 dark:bg-gray-800/30 border border-gray-300 dark:border-gray-600 rounded-none h-10",
                                    "font-mono text-[0.75rem] p-3 pl-10 outline-none transition-all",
                                    "placeholder:text-gray-400/50 text-gray-900 dark:text-white",
                                    "focus:bg-lab-accent/5 focus:ring-1 focus:ring-lab-primary/20 dark:focus:ring-lab-accent/20 focus:border-lab-accent border-dashed",
                                    pending && "opacity-50 cursor-not-allowed"
                                )}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={pending || !message.trim()}
                            className={cn(
                                "px-8 h-full border bg-white dark:bg-gray-900 font-bold uppercase text-[0.6rem] tracking-[0.2em] min-h-10 border-dashed border-gray-300 dark:border-gray-600 transition-all flex items-center justify-center gap-2 rounded-none cursor-pointer text-gray-700 dark:text-gray-300",
                                !pending && message.trim() && "hover:border-lab-accent hover:text-lab-primary dark:hover:text-lab-accent hover:bg-lab-accent/5 active:scale-95",
                                (pending || !message.trim()) && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            <Send size={12} className={cn(pending && "animate-bounce")} />
                            <span>{pending ? "SENDING..." : "SEND"}</span>
                        </button>
                    </form>
                </div>

                {/* Status Line */}
                <div className="mt-6 flex items-center justify-between relative z-10">
                    <span className="text-[0.55rem] font-mono uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        Status:{" "}
                        {pending ? (
                            <span className="text-gray-500">Establishing Handshake...</span>
                        ) : (
                            <span className="text-lab-accent border p-0.5 border-lab-accent">
                                Ready
                            </span>
                        )}
                    </span>
                    <span className="text-[0.55rem] font-mono text-gray-400/40 dark:text-gray-600">
                        SECURE_ID: 0x44FE1
                    </span>
                </div>
            </div>
        </div>
    );
};

export default SecureMessageGateway;
