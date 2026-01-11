import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import Background from '../../components/Background';
import Starfield from '../../components/Starfield';
import { useAuthModal } from '../contexts/modals/AuthModalContext';

const LandingPage = () => {
  const { openAuthModal } = useAuthModal();
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background layers - same as main app */}
      <Background />
      <Starfield />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        {/* Main content container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-lg"
        >
          {/* Logo/Brand */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-neural text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-white mb-4"
          >
            innrvo
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-slate-400 text-lg md:text-xl font-light tracking-wide mb-12"
          >
            Meditation, made for you
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {/* Primary CTA - Get Started */}
            <motion.button
              onClick={() => openAuthModal('signup')}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-white font-medium text-base tracking-wide overflow-hidden group transition-all duration-300 hover:border-cyan-400/50"
            >
              <span className="relative z-10">Get Started</span>
              {/* Animated gradient on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovering ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>

            {/* Secondary CTA - Sign In */}
            <motion.button
              onClick={() => openAuthModal('signin')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3.5 rounded-full text-slate-400 font-medium text-base tracking-wide hover:text-white transition-colors duration-300"
            >
              Sign In
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Subtle bottom indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <p className="text-slate-600 text-xs tracking-wider uppercase">
            AI-powered personalized meditation
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default memo(LandingPage);
