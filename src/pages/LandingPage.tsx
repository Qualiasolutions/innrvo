import { memo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import MarketingLayout from '../layouts/MarketingLayout';
import { useAuthModal } from '../contexts/modals/AuthModalContext';
import { usePageMeta } from '../hooks/usePageMeta';

// Static data - module scope to avoid recreation on render
const FEATURES = [
  {
    iconPath: 'M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z',
    title: 'Your Voice, Your Power',
    description: 'Clone your voice in 60 seconds. Hear meditations and affirmations spoken by the one voice your subconscious trusts most — yours.',
  },
  {
    iconPath: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z',
    title: 'AI That Understands You',
    description: 'Describe your mood, your goal, or just how you feel. Our AI crafts a meditation uniquely for this moment — no generic scripts.',
  },
  {
    iconPath: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
    title: '5 Dimensions of Wellness',
    description: 'Guided meditations, affirmations, self-hypnosis, guided journeys, and children\'s stories — all personalized, all yours.',
  },
] as const;

const STEPS = [
  { num: '01', title: 'Describe how you feel', description: 'Type or speak what you need — "calm my racing thoughts" or "help me believe in myself"' },
  { num: '02', title: 'Make it yours', description: 'Choose your cloned voice, pick background music, or start from a template' },
  { num: '03', title: 'Listen & transform', description: 'AI generates a full meditation script and speaks it in your chosen voice, instantly' },
] as const;

const CONTENT_TYPES = [
  { name: 'Meditations', icon: '🧘', desc: 'Guided visualizations & breathwork' },
  { name: 'Affirmations', icon: '✦', desc: 'Power statements in your voice' },
  { name: 'Self-Hypnosis', icon: '🌀', desc: 'Deep subconscious reprogramming' },
  { name: 'Journeys', icon: '🌌', desc: 'Astral, shamanic & past life' },
  { name: 'Kids Stories', icon: '🌙', desc: 'Bedtime stories for children' },
] as const;

const TESTIMONIALS = [
  {
    quote: "Hearing affirmations in my own voice changed everything. It feels like I'm actually talking to myself — because I am.",
    name: 'Sarah M.',
    role: 'Daily meditator',
  },
  {
    quote: "I've tried Calm, Headspace, everything. Nothing hits like hearing your own voice guide you through a meditation you designed.",
    name: 'James K.',
    role: 'Meditation teacher',
  },
  {
    quote: "My kids fall asleep in minutes now. I generate a new bedtime story every night and they love hearing my voice tell it.",
    name: 'Priya T.',
    role: 'Parent of two',
  },
] as const;

// Reusable animated section wrapper
interface SectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const Section = memo(({ children, className = '', delay = 0 }: SectionProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
});

const LandingPage = () => {
  const { openAuthModal } = useAuthModal();
  usePageMeta({
    title: 'AI Meditations in Your Own Voice',
    description: 'Innrvo generates personalized guided meditations spoken in your own cloned voice. AI-powered affirmations, self-hypnosis, guided journeys, and more.',
  });

  return (
    <MarketingLayout>
      {/* ========== Hero Section ========== */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="mb-10 md:mb-14 flex justify-center"
          >
            <motion.img
              src="/logo.png"
              alt="Innrvo"
              className="h-48 md:h-64 lg:h-72 w-auto object-contain"
              animate={{
                filter: [
                  "drop-shadow(0 0 30px rgba(6,182,212,0.2))",
                  "drop-shadow(0 0 60px rgba(6,182,212,0.35))",
                  "drop-shadow(0 0 30px rgba(6,182,212,0.2))"
                ]
              }}
              transition={{
                filter: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
            />
          </motion.div>

          {/* Tagline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-3xl md:text-4xl lg:text-5xl font-light tracking-wide text-white/90 mb-5"
          >
            Speak it. Feel it.{' '}
            <span className="text-sky-400">Become it.</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-slate-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-10"
          >
            AI-powered meditations spoken in your own cloned voice.
            <br className="hidden sm:block" />
            Personalized to exactly how you feel, right now.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => openAuthModal('signup')}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-medium text-sm tracking-wide shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300"
            >
              Start Free — No Card Required
            </button>
            <a
              href="#how-it-works"
              className="px-6 py-3 text-sm text-slate-400 hover:text-white transition-colors"
            >
              See How It Works
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-12 bg-gradient-to-b from-transparent via-slate-500 to-transparent"
          />
        </motion.div>
      </section>

      {/* ========== Features Section ========== */}
      <section id="features" className="relative z-10 px-6 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <Section>
            <p className="text-sky-400 text-xs font-semibold uppercase tracking-[0.3em] text-center mb-4">Why Innrvo</p>
            <h2 className="text-2xl md:text-4xl font-light text-center text-white/90 mb-4">
              The most personal meditation
              <br className="hidden sm:block" />
              experience ever created
            </h2>
            <p className="text-slate-500 text-center max-w-lg mx-auto mb-16">
              No voice carries more authority to your subconscious than your own.
            </p>
          </Section>

          <Section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FEATURES.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="group p-6 md:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-sky-500/20 hover:bg-white/[0.04] transition-all duration-500"
                >
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-5 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={feature.iconPath} />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ========== How It Works Section ========== */}
      <section id="how-it-works" className="relative z-10 px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto">
          <Section>
            <p className="text-sky-400 text-xs font-semibold uppercase tracking-[0.3em] text-center mb-4">How It Works</p>
            <h2 className="text-2xl md:text-4xl font-light text-center text-white/90 mb-16">
              From intention to meditation
              <br className="hidden sm:block" />
              in under a minute
            </h2>
          </Section>

          <Section>
            <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-3 md:gap-8 relative">
              {/* Connecting line (desktop only) */}
              <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-sky-500/30 via-sky-500/20 to-sky-500/30" />

              {STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center relative"
                >
                  <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto mb-6 relative z-10">
                    <span className="text-2xl font-light text-sky-400 font-neural">{step.num}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ========== Content Types Section ========== */}
      <section className="relative z-10 px-6 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <Section>
            <p className="text-sky-400 text-xs font-semibold uppercase tracking-[0.3em] text-center mb-4">Content Library</p>
            <h2 className="text-2xl md:text-4xl font-light text-center text-white/90 mb-16">
              Five dimensions of inner work
            </h2>
          </Section>

          <Section>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {CONTENT_TYPES.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="group p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-sky-500/20 hover:bg-white/[0.04] transition-all duration-500 text-center"
                >
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <h4 className="text-sm font-semibold text-white mb-1">{item.name}</h4>
                  <p className="text-xs text-slate-600">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ========== Social Proof / Trust Section ========== */}
      <section className="relative z-10 px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto">
          <Section>
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-10">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-7 h-7 rounded-full border-2 border-[#020617] ${
                      ['bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500'][i]
                    }`} />
                  ))}
                </div>
                <span className="text-sm text-slate-400 ml-2">Join seekers finding their inner voice</span>
              </div>
            </div>
          </Section>

          <Section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((testimonial, i) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-5 italic">"{testimonial.quote}"</p>
                  <div>
                    <p className="text-sm font-medium text-white">{testimonial.name}</p>
                    <p className="text-xs text-slate-500">{testimonial.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ========== Pricing Teaser ========== */}
      <section className="relative z-10 px-6 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <Section>
            <p className="text-sky-400 text-xs font-semibold uppercase tracking-[0.3em] mb-4">Pricing</p>
            <h2 className="text-2xl md:text-4xl font-light text-white/90 mb-5">
              Start free. Upgrade when you're ready.
            </h2>
            <p className="text-slate-500 max-w-md mx-auto mb-10">
              5 free meditations per day. No credit card. No commitment.
              Upgrade to Pro for unlimited meditations and voice cloning.
            </p>

            <div className="inline-flex items-baseline gap-1 mb-8">
              <span className="text-4xl md:text-5xl font-light text-white">$0</span>
              <span className="text-slate-500 text-sm"> / forever free</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => openAuthModal('signup')}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-medium text-sm tracking-wide shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300"
              >
                Get Started Free
              </button>
              <Link
                to="/pricing"
                className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-3"
              >
                Compare all plans →
              </Link>
            </div>
          </Section>
        </div>
      </section>

      {/* ========== Final CTA ========== */}
      <section className="relative z-10 px-6 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <Section>
            <h2 className="text-3xl md:text-5xl font-light text-white/90 mb-6">
              Your voice.{' '}
              <span className="text-sky-400">Your reality.</span>
            </h2>
            <p className="text-slate-400 text-base max-w-md mx-auto mb-10">
              Start creating personalized meditations that actually resonate — because they're made by you, for you, in your voice.
            </p>
            <button
              onClick={() => openAuthModal('signup')}
              className="px-10 py-4 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-medium tracking-wide shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300"
            >
              Start Your Journey
            </button>
          </Section>
        </div>
      </section>

    </MarketingLayout>
  );
};

export default memo(LandingPage);
