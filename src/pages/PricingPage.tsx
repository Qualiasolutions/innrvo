import React, { useState } from 'react';
import { motion } from 'framer-motion';
import MarketingLayout from '../layouts/MarketingLayout';
import GlassCard from '../../components/GlassCard';
import { useAuthModal } from '../contexts/modals/AuthModalContext';
import { usePageMeta } from '../hooks/usePageMeta';

const Check = ({ color = 'text-emerald-400' }: { color?: string }) => (
  <svg className={`w-4 h-4 ${color} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const faqs = [
  {
    q: 'What happens when I run out of free meditations?',
    a: 'Your 5 daily meditations reset every 24 hours. You can always listen to previously saved meditations from your library. Upgrade to Pro for unlimited generations.',
  },
  {
    q: 'How does voice cloning work?',
    a: 'Record about 60 seconds of yourself speaking naturally. Our AI creates a voice model that sounds like you. Your meditations and affirmations are then generated in your own voice.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no hidden fees. Cancel your Pro subscription anytime and keep access until the end of your billing period. Your saved meditations remain yours.',
  },
  {
    q: 'Is my voice data safe?',
    a: 'Your voice samples are encrypted and stored securely. We never share your voice data with third parties. You can delete your voice clone and all associated data at any time.',
  },
];

const PricingPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { openAuthModal } = useAuthModal();
  usePageMeta({
    title: 'Pricing',
    description: 'Start free with 5 meditations per day. Upgrade to Pro for unlimited meditations, voice cloning, and more. No credit card required.',
  });

  return (
    <MarketingLayout>
      <div className="flex-1 flex flex-col items-center pt-24 md:pt-28 max-w-5xl mx-auto w-full pb-12 px-6">
        <div className="inline-block px-4 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-6">Pricing</div>
        <h2 className="text-3xl md:text-5xl font-extralight text-center mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-amber-300 via-orange-200 to-yellow-300 bg-clip-text text-transparent">Simple, Honest Pricing</span>
        </h2>
        <p className="text-slate-500 text-center mb-12 max-w-lg">Start free. No credit card required. Upgrade when you're ready.</p>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {/* Free Tier */}
          <GlassCard className="!p-6 !rounded-2xl" hover={false}>
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Free</h3>
              <div className="text-3xl font-bold text-white">$0</div>
              <div className="text-sm text-slate-500">Forever free</div>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                '5 meditations per day',
                '4 premium AI voices',
                '20+ guided templates',
                'Save to your library',
                'Background music',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => openAuthModal('signup')}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all"
            >
              Get Started Free
            </button>
          </GlassCard>

          {/* Pro Tier */}
          <GlassCard className="!p-6 !rounded-2xl border-2 border-amber-500/30 relative" hover={false}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </div>
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Pro</h3>
              <div className="text-3xl font-bold text-white">$9.99</div>
              <div className="text-sm text-slate-500">per month</div>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                'Unlimited meditations',
                'Clone your own voice',
                'All 5 content types',
                'Full music library (30+ tracks)',
                'Download as MP3',
                'Priority generation speed',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check color="text-amber-400" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => openAuthModal('signup')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all"
            >
              Upgrade to Pro
            </button>
          </GlassCard>

          {/* Team Tier */}
          <GlassCard className="!p-6 !rounded-2xl" hover={false}>
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Team</h3>
              <div className="text-3xl font-bold text-white">$29.99</div>
              <div className="text-sm text-slate-500">per month</div>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                'Everything in Pro',
                '5 team members included',
                'Shared meditation library',
                'Team admin dashboard',
                'Priority support',
                'Custom voice profiles per member',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check color="text-sky-400" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => window.location.href = 'mailto:hello@innrvo.com?subject=Team%20Plan%20Inquiry'}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all"
            >
              Contact Sales
            </button>
          </GlassCard>
        </div>

        {/* Feature Comparison */}
        <div className="w-full mt-16">
          <h3 className="text-lg font-semibold text-white text-center mb-8">Compare plans</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-slate-400 font-normal py-3 pr-4">Feature</th>
                  <th className="text-center text-slate-400 font-normal py-3 px-4">Free</th>
                  <th className="text-center text-amber-400 font-normal py-3 px-4">Pro</th>
                  <th className="text-center text-sky-400 font-normal py-3 px-4">Team</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  ['Daily meditations', '5 / day', 'Unlimited', 'Unlimited'],
                  ['AI voices', '4', '10+', '10+'],
                  ['Voice cloning', '—', '✓', '✓ per member'],
                  ['Templates', '20+', 'All', 'All'],
                  ['Background music', 'Basic', 'Full library', 'Full library'],
                  ['MP3 downloads', '—', '✓', '✓'],
                  ['Self-hypnosis & journeys', '—', '✓', '✓'],
                  ['Team members', '1', '1', '5'],
                  ['Support', 'Community', 'Email', 'Priority'],
                ].map(([feature, free, pro, team], i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="py-3 pr-4 text-slate-400">{feature}</td>
                    <td className="py-3 px-4 text-center">{free}</td>
                    <td className="py-3 px-4 text-center">{pro}</td>
                    <td className="py-3 px-4 text-center">{team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="w-full mt-16 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-white text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-slate-300 font-medium">{faq.q}</span>
                  <motion.svg
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-4 h-4 text-slate-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </button>
                <motion.div
                  id={`faq-answer-${i}`}
                  role="region"
                  initial={false}
                  animate={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-4 text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};

export default PricingPage;
