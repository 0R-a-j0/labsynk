import React, { useState } from 'react';
import { api } from '../services/api';
import {
    Cpu, CircuitBoard, Code2, Wifi, Radio,
    Globe, Database, Shield, FileSearch, Send,
    Lightbulb, Rocket, Presentation, TrendingUp, ExternalLink,
    ChevronRight, Layers
} from 'lucide-react';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RESOURCE HUB DATA
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const hubSections = [
    {
        id: 'iot',
        title: 'Internet of Things (IoT) Hub',
        subtitle: 'PCB design, simulation, and embedded programming tools',
        gradient: 'from-cyan-500 to-blue-600',
        iconBg: 'bg-cyan-500/10',
        iconColor: 'text-cyan-600',
        icon: Cpu,
        categories: [
            {
                name: 'PCB Design',
                icon: CircuitBoard,
                tools: [
                    {
                        name: 'EasyEDA',
                        desc: 'Web-based PCB design with manufacturing integration',
                        url: 'https://easyeda.com/',
                        tag: 'Web-Based',
                    },
                    {
                        name: 'KiCad',
                        desc: 'Industry-standard open-source electronics design',
                        url: 'https://www.kicad.org/',
                        tag: 'Open Source',
                    },
                    {
                        name: 'PCBWay',
                        desc: 'PCB prototyping and manufacturing service',
                        url: 'https://www.pcbway.com/',
                        tag: 'Manufacturing',
                    },
                    {
                        name: 'JLCPCB',
                        desc: 'Affordable PCB fabrication and assembly',
                        url: 'https://jlcpcb.com/',
                        tag: 'Manufacturing',
                    },
                ],
            },
            {
                name: 'Simulation',
                icon: Radio,
                tools: [
                    {
                        name: 'Wokwi',
                        desc: 'Free online simulator for Arduino, ESP32, and RPi Pico',
                        url: 'https://wokwi.com/',
                        tag: 'Free',
                    },
                    {
                        name: 'Tinkercad Circuits',
                        desc: 'Beginner-friendly Arduino and circuit simulation',
                        url: 'https://www.tinkercad.com/circuits',
                        tag: 'Beginner',
                    },
                ],
            },
            {
                name: 'Programming',
                icon: Code2,
                tools: [
                    {
                        name: 'Arduino IDE (Web)',
                        desc: 'Cloud-based Arduino code editor and manager',
                        url: 'https://create.arduino.cc/editor',
                        tag: 'Cloud',
                    },
                    {
                        name: 'PlatformIO',
                        desc: 'Professional embedded development in VS Code',
                        url: 'https://platformio.org/',
                        tag: 'Pro',
                    },
                    {
                        name: 'MicroPython',
                        desc: 'Python for microcontrollers â€” ESP32, RPi Pico, etc.',
                        url: 'https://micropython.org/',
                        tag: 'Python',
                    },
                    {
                        name: 'Programiz',
                        desc: 'Online Python compiler for quick script testing',
                        url: 'https://www.programiz.com/python-programming/online-compiler/',
                        tag: 'Online',
                    },
                ],
            },
        ],
    },
    {
        id: 'egov',
        title: 'E-Governance & Civic Tech',
        subtitle: 'Open data analytics, service prototyping, and security frameworks',
        gradient: 'from-emerald-500 to-teal-600',
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-600',
        icon: Globe,
        categories: [
            {
                name: 'Open Data & Analytics',
                icon: Database,
                tools: [
                    {
                        name: 'OGD Platform (data.gov.in)',
                        desc: "India's open government data portal with real-world datasets",
                        url: 'https://data.gov.in/',
                        tag: 'India',
                    },
                    {
                        name: 'Kaggle â€” Civic Datasets',
                        desc: 'Public policy and civic data for analysis projects',
                        url: 'https://www.kaggle.com/datasets?tags=13207-Public+Policy',
                        tag: 'Datasets',
                    },
                    {
                        name: 'Metabase',
                        desc: 'Open-source business intelligence and data visualization',
                        url: 'https://www.metabase.com/',
                        tag: 'Open Source',
                    },
                    {
                        name: 'Apache Superset',
                        desc: 'Modern data exploration and visualization platform',
                        url: 'https://superset.apache.org/',
                        tag: 'Open Source',
                    },
                ],
            },
            {
                name: 'Service Prototyping & Workflow',
                icon: FileSearch,
                tools: [
                    {
                        name: 'Draw.io (Diagrams.net)',
                        desc: 'Free flowcharting tool for mapping government processes',
                        url: 'https://app.diagrams.net/',
                        tag: 'Free',
                    },
                    {
                        name: 'Postman',
                        desc: 'API testing & development â€” great for API Setu integration',
                        url: 'https://www.postman.com/',
                        tag: 'API',
                    },
                ],
            },
            {
                name: 'Security & Identity',
                icon: Shield,
                tools: [
                    {
                        name: 'OWASP',
                        desc: 'Security guidelines for building public-facing applications',
                        url: 'https://owasp.org/',
                        tag: 'Security',
                    },
                    {
                        name: 'Hyperledger',
                        desc: 'Enterprise blockchain for transparent governance records',
                        url: 'https://www.hyperledger.org/',
                        tag: 'Blockchain',
                    },
                ],
            },
        ],
    },
    {
        id: 'innovate',
        title: 'Innovation & Entrepreneurship',
        subtitle: 'Turn lab projects into startup MVPs with these tools',
        gradient: 'from-violet-500 to-purple-600',
        iconBg: 'bg-violet-500/10',
        iconColor: 'text-violet-600',
        icon: Lightbulb,
        categories: [
            {
                name: 'Business Modeling & Planning',
                icon: TrendingUp,
                tools: [
                    {
                        name: 'Lean Canvas (Strategyzer)',
                        desc: 'Map problem, solution, and customer segments quickly',
                        url: 'https://www.strategyzer.com/library/the-business-model-canvas',
                        tag: 'Strategy',
                    },
                    {
                        name: 'Notion Startup Templates',
                        desc: 'Organize team docs, PRDs, and roadmaps effortlessly',
                        url: 'https://www.notion.so/templates/category/startups',
                        tag: 'Templates',
                    },
                ],
            },
            {
                name: 'Pitching & Prototyping',
                icon: Presentation,
                tools: [
                    {
                        name: 'Canva',
                        desc: 'Design pitch decks, branding assets, and social media',
                        url: 'https://www.canva.com/',
                        tag: 'Design',
                    },
                    {
                        name: 'Figma',
                        desc: 'Collaborative UI/UX design and prototyping',
                        url: 'https://www.figma.com/',
                        tag: 'Design',
                    },
                    {
                        name: 'Framer',
                        desc: 'Publish professional landing pages to validate ideas fast',
                        url: 'https://www.framer.com/',
                        tag: 'Landing Page',
                    },
                ],
            },
            {
                name: 'Ecosystem & Validation',
                icon: Rocket,
                tools: [
                    {
                        name: 'Startup India Portal',
                        desc: 'DPIIT recognition, schemes, and compliance resources',
                        url: 'https://www.startupindia.gov.in/',
                        tag: 'India',
                    },
                    {
                        name: 'Y Combinator Startup Library',
                        desc: 'World-class free advice on scaling and iterating',
                        url: 'https://www.ycombinator.com/library',
                        tag: 'Free',
                    },
                ],
            },
        ],
    },
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TAG COLOR MAP
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const tagColors = {
    'Web-Based': 'bg-sky-100 text-sky-700',
    'Open Source': 'bg-emerald-100 text-emerald-700',
    'Manufacturing': 'bg-amber-100 text-amber-700',
    'Free': 'bg-green-100 text-green-700',
    'Beginner': 'bg-pink-100 text-pink-700',
    'Cloud': 'bg-indigo-100 text-indigo-700',
    'Pro': 'bg-purple-100 text-purple-700',
    'Python': 'bg-yellow-100 text-yellow-700',
    'Online': 'bg-cyan-100 text-cyan-700',
    'India': 'bg-orange-100 text-orange-700',
    'Datasets': 'bg-blue-100 text-blue-700',
    'API': 'bg-violet-100 text-violet-700',
    'Security': 'bg-red-100 text-red-700',
    'Blockchain': 'bg-slate-100 text-slate-700',
    'Strategy': 'bg-fuchsia-100 text-fuchsia-700',
    'Templates': 'bg-teal-100 text-teal-700',
    'Design': 'bg-rose-100 text-rose-700',
    'Landing Page': 'bg-lime-100 text-lime-700',
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   COMPONENTS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const ToolCard = ({ tool }) => (
    <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white/80 border border-gray-200/60
               hover:border-lab-primary/20 hover:shadow-lg hover:shadow-lab-primary/8 hover:-translate-y-1
               transition-all duration-300 backdrop-blur-sm"
    >
        <div>
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900 group-hover:text-lab-primary transition-colors">
                    {tool.name}
                </h4>
                <ExternalLink size={14} className="text-gray-300 group-hover:text-lab-accent transition-colors" />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">{tool.desc}</p>
        </div>
        {tool.tag && (
            <span className={`inline-flex self-start px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${tagColors[tool.tag] || 'bg-gray-100 text-gray-600'}`}>
                {tool.tag}
            </span>
        )}
    </a>
);

const CategorySection = ({ category }) => {
    const Icon = category.icon;
    return (
        <div className="mb-8 last:mb-0">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-lab-primary/5">
                    <Icon size={16} className="text-lab-primary" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">{category.name}</h3>
                <span className="text-xs text-gray-400 ml-1">({category.tools.length} tools)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {category.tools.map((tool) => (
                    <ToolCard key={tool.name} tool={tool} />
                ))}
            </div>
        </div>
    );
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN PAGE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const ResourceHub = () => {
    const [activeHub, setActiveHub] = useState('iot');
    const [showSuggestModal, setShowSuggestModal] = useState(false);
    const [suggestionForm, setSuggestionForm] = useState({ tool_name: '', description: '', url: '' });
    const [submitting, setSubmitting] = useState(false);
    const activeSection = hubSections.find((s) => s.id === activeHub);

    const handleSuggestSubmit = async (e) => {
        e.preventDefault();
        if (!suggestionForm.tool_name || !suggestionForm.description) return;
        setSubmitting(true);
        try {
            await api.suggestResource(suggestionForm);
            alert('Suggestion submitted successfully! Thank you for your contribution.');
            setShowSuggestModal(false);
            setSuggestionForm({ tool_name: '', description: '', url: '' });
        } catch (err) {
            console.error(err);
            alert('Failed to submit suggestion. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
            {/* â”€â”€ Header â”€â”€ */}
            <header className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-lab-primary to-lab-accent shadow-lg shadow-lab-primary/20">
                        <Layers size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="page-header">Resource Hub</h1>
                        <p className="page-subtitle">Curated tools and platforms for IoT, Civic Tech, and Entrepreneurship</p>
                    </div>
                </div>
            </header>

            {/* â”€â”€ Hub Selector Tabs â”€â”€ */}
            <nav className="flex flex-wrap gap-3 mb-8" aria-label="Resource hub categories">
                {hubSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeHub === section.id;
                    return (
                        <button
                            key={section.id}
                            onClick={() => setActiveHub(section.id)}
                            className={`group flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold
                         transition-all duration-300 border
                         ${isActive
                                    ? `bg-gradient-to-r ${section.gradient} text-white border-transparent shadow-lg shadow-${section.id === 'iot' ? 'cyan' : section.id === 'egov' ? 'emerald' : 'violet'}-500/25`
                                    : 'bg-white/80 text-gray-600 border-gray-200/80 hover:border-lab-primary/20 hover:text-lab-primary hover:shadow-md'
                                }`}
                        >
                            <Icon size={18} className={isActive ? 'text-white' : undefined} />
                            <span className="hidden sm:inline">{section.title}</span>
                            <span className="sm:hidden">
                                {section.id === 'iot' ? 'IoT' : section.id === 'egov' ? 'E-Gov' : 'Startup'}
                            </span>
                        </button>
                    );
                })}
            </nav>

            {/* â”€â”€ Active Section Content â”€â”€ */}
            {activeSection && (
                <div
                    key={activeSection.id}
                    className="section-card animate-fade-in"
                >
                    {/* Section Header */}
                    <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
                        <div className={`p-3 rounded-xl ${activeSection.iconBg}`}>
                            <activeSection.icon size={24} className={activeSection.iconColor} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{activeSection.title}</h2>
                            <p className="text-sm text-gray-500">{activeSection.subtitle}</p>
                        </div>
                    </div>

                    {/* Categories */}
                    {activeSection.categories.map((cat) => (
                        <CategorySection key={cat.name} category={cat} />
                    ))}
                </div>
            )}

            {/* â”€â”€ Footer CTA â”€â”€ */}
            <div className="mt-10 text-center">
                <button
                    onClick={() => setShowSuggestModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-lab-primary/5 text-lab-primary text-sm font-medium hover:bg-lab-primary/10 transition-colors"
                >
                    <Lightbulb size={16} />
                    Know a great tool? Suggest it to your lab instructor!
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Suggestion Modal */}
            {showSuggestModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSuggestModal(false)} />
                    <div className="relative glass rounded-3xl shadow-glass-lg w-full max-w-lg p-8 animate-scale-in">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Lightbulb size={20} className="text-lab-primary" /> Suggest a Tool
                        </h3>
                        <form onSubmit={handleSuggestSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tool Name *</label>
                                <input
                                    type="text" required
                                    value={suggestionForm.tool_name}
                                    onChange={e => setSuggestionForm({ ...suggestionForm, tool_name: e.target.value })}
                                    className="input-field" placeholder="e.g. Awesome Simulator"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">URL *</label>
                                <input
                                    type="url" required
                                    value={suggestionForm.url}
                                    onChange={e => setSuggestionForm({ ...suggestionForm, url: e.target.value })}
                                    className="input-field" placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
                                <textarea
                                    required rows="3"
                                    value={suggestionForm.description}
                                    onChange={e => setSuggestionForm({ ...suggestionForm, description: e.target.value })}
                                    className="input-field" placeholder="Why is this tool useful?..."
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowSuggestModal(false)} className="btn-ghost flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                                    {submitting ? 'Submitting...' : 'Submit Suggestion'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ResourceHub;
