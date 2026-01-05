
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThreeScene from '../components/ThreeScene';
import { BookOpen, Users, Video, Shield, Award, Zap } from 'lucide-react';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2,
            delayChildren: 0.3
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 100 }
    }
};

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
    <motion.div
        variants={itemVariants}
        className="glass-card p-6 rounded-2xl border border-white/40 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-300"
    >
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mb-4 text-white shadow-lg shadow-indigo-500/30">
            <Icon size={24} />
        </div>
        <h3 className="text-xl font-bold mb-2 text-gray-800">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
    </motion.div>
);

export default function Home() {
    return (
        <div className="relative min-h-screen">
            <ThreeScene />

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="container mx-auto max-w-7xl">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="text-center max-w-4xl mx-auto"
                    >
                        <motion.h1
                            variants={itemVariants}
                            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8"
                        >
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 drop-shadow-sm">
                                The Complete
                            </span>
                            <br />
                            <span className="text-gray-900 drop-shadow-lg">
                                Digital Campus
                            </span>
                        </motion.h1>

                        <motion.p
                            variants={itemVariants}
                            className="text-xl md:text-2xl text-gray-700 mb-10 leading-relaxed max-w-2xl mx-auto backdrop-blur-sm bg-white/30 p-4 rounded-xl"
                        >
                            Complete digital campus solution. Seamlessly managing classrooms,
                            students, and live interactive learning sessions in one secure platform.
                        </motion.p>

                        <motion.div
                            variants={itemVariants}
                            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                        >
                            <Link to="/login" className="group relative px-8 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg overflow-hidden shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 transition-all">
                                <span className="relative z-10 flex items-center gap-2">
                                    Login to Portal <Zap size={20} className="group-hover:fill-current" />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </Link>

                            <Link to="/admin/login" className="px-8 py-4 bg-white/80 backdrop-blur-md text-slate-700 rounded-full font-bold text-lg border border-slate-200 hover:bg-white transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                                <Shield size={20} /> Admin Access
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </section>



            {/* Features Grid */}
            <section className="py-20 px-6">
                <div className="container mx-auto max-w-7xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose EduPulse?</h2>
                        <p className="text-xl text-gray-600">Everything you need to excel in your studies</p>
                    </div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={containerVariants}
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        <FeatureCard
                            icon={Video}
                            title="HD Live Classes"
                            description="Interact with teachers in real-time with crystal clear video and high-fidelity audio streaming."
                        />
                        <FeatureCard
                            icon={Users}
                            title="Collaborative Learning"
                            description="Work together with peers in breakout rooms and shared whiteboards for group projects."
                        />
                        <FeatureCard
                            icon={BookOpen}
                            title="Smart Resources"
                            description="Access a vast library of study materials, recorded lectures, and AI-summarized notes."
                        />
                        <FeatureCard
                            icon={Shield}
                            title="Secure Platform"
                            description="Enterprise-grade security ensures your data and personal information remains protected."
                        />
                        <FeatureCard
                            icon={Award}
                            title="Certified Courses"
                            description="Earn recognized certificates upon completion to boost your academic and professional profile."
                        />
                        <FeatureCard
                            icon={Zap}
                            title="Instant Doubt Solving"
                            description="Get your queries resolved instantly during class or via our 24/7 mentor support channel."
                        />
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
