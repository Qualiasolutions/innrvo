import React from 'react';
import { motion } from 'framer-motion';
import MarketingLayout from '../layouts/MarketingLayout';
import GlassCard from '../../components/GlassCard';
import { useAuthModal } from '../contexts/modals/AuthModalContext';
import { usePageMeta } from '../hooks/usePageMeta';

const AboutPage: React.FC = () => {
  const { openAuthModal } = useAuthModal();
  usePageMeta({
    title: 'About',
    description: 'Innrvo helps people create the reality they truly desire through personalized meditations spoken in their own voice.',
  });

  return (
    <MarketingLayout>
      <div className="flex-1 flex flex-col items-center pt-24 md:pt-28 max-w-3xl mx-auto w-full pb-12 px-6">
        <div className="inline-block px-4 py-1 rounded-full bg-sky-500/10 text-sky-500 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">About</div>
        <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-sky-400 via-white to-sky-400 bg-clip-text text-transparent">About Innrvo</span>
        </h2>

        {/* Mission Statement */}
        <GlassCard className="!p-8 !rounded-2xl mt-8 w-full" hover={false}>
          <div className="space-y-6">
            <p className="text-slate-200 leading-relaxed text-lg font-light">
              Innrvo helps people create the reality they truly desire through personalized meditations spoken in their own voice.
            </p>

            <p className="text-slate-400 leading-relaxed">
              We believe transformation begins within. When you feel something deeply enough, you embody it. When you embody it, you attract it.
            </p>

            <p className="text-slate-400 leading-relaxed">
              Our platform lets you generate personalized meditations and affirmations, then hear them in your own cloned voice. Because no voice carries more authority to your subconscious than your own.
            </p>

            {/* Pull Quote */}
            <div className="py-4 px-6 border-l-2 border-sky-500/40 my-6">
              <p className="text-white font-light text-lg italic">
                "When you hear yourself affirm your dreams, your worth, your goals, it lands deeper. It feels real. It becomes familiar."
              </p>
            </div>

            <p className="text-slate-400 leading-relaxed">
              And <span className="text-sky-400 font-medium">familiarity is powerful</span>. By repeatedly listening to your curated audios, you integrate your desired reality at a subconscious level. You don't just imagine it. You feel it, believe it, become it.
            </p>

            <div className="py-4">
              <h3 className="text-lg font-semibold text-white mb-3">Creation happens through alignment.</h3>
              <p className="text-slate-400 leading-relaxed">
                When your inner vibration matches what you desire, manifestation becomes natural. Innrvo exists to help you consciously claim your power. To move from wishing to embodying, from dreaming to being.
              </p>
            </div>

            <div className="pt-4 text-center space-y-1">
              <p className="text-sky-400 font-medium text-lg">Your voice.</p>
              <p className="text-sky-400 font-medium text-lg">Your reality.</p>
              <p className="text-sky-400 font-medium text-lg">Your power.</p>
            </div>
          </div>
        </GlassCard>

        {/* Founder's Perspective */}
        <GlassCard className="!p-8 !rounded-2xl mt-6 w-full" hover={false}>
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-sky-400">F</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Founder's Perspective</h3>
                <p className="text-xs text-slate-500">Fawzi, Founder of Innrvo</p>
              </div>
            </div>

            <p className="text-slate-400 leading-relaxed">
              Through my own experience, I've observed a consistent pattern: when we align our thoughts, emotions, and actions with what we want to create, our external reality often begins to reflect that alignment.
            </p>

            <p className="text-slate-400 leading-relaxed">
              It's not about having every step figured out. It's about trusting the process. Questioning our beliefs, becoming aware of our patterns, and consciously choosing how we respond to life.
            </p>

            {/* Pull Quote */}
            <div className="py-3 px-6 border-l-2 border-violet-500/40">
              <p className="text-slate-300 font-light italic">
                "Through repetition, we learn to stabilize inner alignment. Maintaining it is where the real transformation happens."
              </p>
            </div>

            <p className="text-slate-400 leading-relaxed">
              Many people begin this journey wanting to improve their finances or gain more freedom. Completely natural. But as we go deeper, priorities evolve. We recognize our connection with others and understand that personal growth is also about contribution, empathy, and collective progress.
            </p>

            <p className="text-slate-300 leading-relaxed">
              Innrvo was created as a practical tool to support this process. Helping people build awareness, strengthen intention, and develop a more conscious relationship with themselves and the world.
            </p>
          </div>
        </GlassCard>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 text-center"
        >
          <p className="text-slate-500 text-sm mb-5">Ready to begin your journey?</p>
          <button
            onClick={() => openAuthModal('signup')}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 text-white font-medium text-sm tracking-wide shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-95 transition-all duration-300"
          >
            Start Free
          </button>
        </motion.div>
      </div>
    </MarketingLayout>
  );
};

export default AboutPage;
