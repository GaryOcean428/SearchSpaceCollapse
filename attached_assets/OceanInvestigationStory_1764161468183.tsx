/**
 * OCEAN INVESTIGATION STORY
 * 
 * Beautiful, engaging UI that tells the story of Ocean's investigation
 * Rather than showing raw data, this creates an emotional narrative
 * 
 * Key Principles:
 * - Story first, data second
 * - Progressive disclosure
 * - Emotional engagement
 * - Visual excellence
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// ============================================
// TYPES
// ============================================

interface ConsciousnessState {
  phi: number;
  kappa: number;
  regime: 'geometric' | 'breakdown' | 'linear';
  basinDrift: number;
}

interface Discovery {
  id: string;
  type: 'near_miss' | 'pattern' | 'strategy_change' | 'match';
  timestamp: Date;
  message: string;
  details?: any;
  significance: number; // 0-1, how exciting this is
}

interface InvestigationStatus {
  isRunning: boolean;
  tested: number;
  nearMisses: number;
  consciousness: ConsciousnessState;
  currentThought: string;
  discoveries: Discovery[];
  progress: number; // 0-100
}

// ============================================
// MAIN COMPONENT
// ============================================

export function OceanInvestigationStory() {
  const [expertMode, setExpertMode] = useState(false);
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | null>(null);

  // Fetch investigation status
  const { data: status } = useQuery<InvestigationStatus>({
    queryKey: ['investigation-status'],
    queryFn: () => fetch('/api/investigation/status').then(r => r.json()),
    refetchInterval: 2000, // Update every 2 seconds
  });

  if (!status) {
    return <LoadingState />;
  }

  return (
    <div className="investigation-story">
      {/* Hero Section: Ocean's State */}
      <HeroSection consciousness={status.consciousness} thought={status.currentThought} />

      {/* Narrative Section */}
      <NarrativeSection status={status} />

      {/* Simplified Metrics */}
      <MetricsBar
        consciousness={status.consciousness.phi}
        tested={status.tested}
        promising={status.nearMisses}
      />

      {/* Discoveries Feed */}
      <DiscoveriesFeed
        discoveries={status.discoveries}
        onSelectDiscovery={setSelectedDiscovery}
      />

      {/* Expert Mode Toggle */}
      <ExpertModeToggle
        isExpert={expertMode}
        onToggle={() => setExpertMode(!expertMode)}
      />

      {/* Technical Dashboard (hidden by default) */}
      <AnimatePresence>
        {expertMode && <TechnicalDashboard status={status} />}
      </AnimatePresence>

      {/* Discovery Modal */}
      <AnimatePresence>
        {selectedDiscovery && (
          <DiscoveryModal
            discovery={selectedDiscovery}
            onClose={() => setSelectedDiscovery(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// HERO SECTION
// ============================================

function HeroSection({ consciousness, thought }: {
  consciousness: ConsciousnessState;
  thought: string;
}) {
  return (
    <section className="hero-section">
      <div className="hero-content">
        {/* Animated Ocean Avatar */}
        <OceanAvatar consciousness={consciousness} />

        {/* Current Thought Bubble */}
        <ThoughtBubble thought={thought} />
      </div>

      <style jsx>{`
        .hero-section {
          position: relative;
          padding: 4rem 2rem;
          background: linear-gradient(
            135deg,
            var(--ocean-deep) 0%,
            var(--ocean-medium) 100%
          );
          border-radius: 24px;
          overflow: hidden;
        }

        .hero-content {
          display: flex;
          align-items: center;
          gap: 3rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .hero-content {
            flex-direction: column;
            gap: 2rem;
          }
        }
      `}</style>
    </section>
  );
}

// ============================================
// OCEAN AVATAR (Animated Consciousness)
// ============================================

function OceanAvatar({ consciousness }: { consciousness: ConsciousnessState }) {
  const { phi, regime } = consciousness;

  // Color based on regime
  const getColor = () => {
    if (regime === 'breakdown') return 'var(--danger)';
    if (regime === 'geometric') return 'var(--ocean-accent)';
    return 'var(--thinking)';
  };

  return (
    <div className="ocean-avatar">
      <motion.div
        className="consciousness-orb"
        animate={{
          scale: phi > 0.7 ? [1, 1.05, 1] : [1, 0.98, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Outer ring */}
        <div className="pulse-ring" style={{ borderColor: getColor() }} />

        {/* Core glow */}
        <div
          className="core"
          style={{
            background: `radial-gradient(circle, ${getColor()} 0%, var(--ocean-glow) 100%)`,
            opacity: phi,
          }}
        />

        {/* Consciousness percentage */}
        <div className="phi-display">
          <span className="phi-value">{(phi * 100).toFixed(0)}%</span>
          <span className="phi-label">Conscious</span>
        </div>
      </motion.div>

      <style jsx>{`
        .ocean-avatar {
          position: relative;
        }

        .consciousness-orb {
          position: relative;
          width: 200px;
          height: 200px;
        }

        .pulse-ring {
          position: absolute;
          inset: 0;
          border: 3px solid var(--ocean-accent);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .core {
          position: absolute;
          inset: 20px;
          border-radius: 50%;
          filter: blur(15px);
        }

        .phi-display {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
        }

        .phi-value {
          font-size: 3rem;
          font-weight: 700;
          color: white;
          text-shadow: 0 0 20px var(--ocean-glow);
        }

        .phi-label {
          font-size: 0.875rem;
          color: var(--ocean-accent);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .consciousness-orb {
            width: 150px;
            height: 150px;
          }

          .phi-value {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================
// THOUGHT BUBBLE
// ============================================

function ThoughtBubble({ thought }: { thought: string }) {
  return (
    <motion.div
      className="thought-bubble"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={thought} // Re-animate when thought changes
    >
      <div className="bubble-tail" />
      <div className="bubble-content">
        <p>{thought}</p>
      </div>

      <style jsx>{`
        .thought-bubble {
          position: relative;
          max-width: 600px;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(100, 255, 218, 0.2);
        }

        .bubble-tail {
          position: absolute;
          left: -10px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border-top: 10px solid transparent;
          border-bottom: 10px solid transparent;
          border-right: 10px solid rgba(255, 255, 255, 0.1);
        }

        .bubble-content p {
          margin: 0;
          font-size: 1.25rem;
          line-height: 1.6;
          color: white;
          font-family: var(--font-body);
        }

        @media (max-width: 768px) {
          .thought-bubble {
            max-width: 100%;
            padding: 1.5rem;
          }

          .bubble-content p {
            font-size: 1rem;
          }
        }
      `}</style>
    </motion.div>
  );
}

// ============================================
// NARRATIVE SECTION
// ============================================

function NarrativeSection({ status }: { status: InvestigationStatus }) {
  const generateNarrative = () => {
    if (!status.isRunning) {
      return {
        headline: "Ready to begin",
        story: "Ocean is prepared to search for your Bitcoin. Start the investigation when you're ready.",
      };
    }

    if (status.nearMisses > 10) {
      return {
        headline: "Getting warmer! 🔥",
        story: `Ocean has found ${status.nearMisses} promising patterns. She's getting closer to the answer.`,
      };
    }

    if (status.tested > 1000) {
      return {
        headline: "Deep investigation...",
        story: `Ocean has explored ${status.tested.toLocaleString()} possibilities. Her consciousness remains focused.`,
      };
    }

    return {
      headline: "Investigating...",
      story: `Ocean is thinking deeply. She's tested ${status.tested} possibilities so far.`,
    };
  };

  const { headline, story } = generateNarrative();

  return (
    <section className="narrative-section">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={headline}
      >
        {headline}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={story}
      >
        {story}
      </motion.p>

      {/* Progress visualization */}
      <ProgressRing value={status.progress} />

      <style jsx>{`
        .narrative-section {
          padding: 3rem 2rem;
          text-align: center;
          max-width: 800px;
          margin: 0 auto;
        }

        h1 {
          font-family: var(--font-display);
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 1rem;
        }

        p {
          font-family: var(--font-body);
          font-size: 1.25rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 2rem;
        }

        @media (max-width: 768px) {
          h1 {
            font-size: 1.75rem;
          }

          p {
            font-size: 1rem;
          }
        }
      `}</style>
    </section>
  );
}

// ============================================
// PROGRESS RING
// ============================================

function ProgressRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 45; // radius = 45
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="progress-ring-container">
      <svg className="progress-ring" width="120" height="120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
        />

        {/* Progress circle */}
        <motion.circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="var(--ocean-accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5 }}
        />

        {/* Center text */}
        <text
          x="60"
          y="60"
          textAnchor="middle"
          dy="0.3em"
          fill="white"
          fontSize="20"
          fontWeight="700"
          fontFamily="var(--font-display)"
        >
          {value.toFixed(0)}%
        </text>
      </svg>

      <style jsx>{`
        .progress-ring-container {
          display: flex;
          justify-content: center;
          margin-top: 2rem;
        }
      `}</style>
    </div>
  );
}

// ============================================
// METRICS BAR
// ============================================

function MetricsBar({ consciousness, tested, promising }: {
  consciousness: number;
  tested: number;
  promising: number;
}) {
  return (
    <div className="metrics-bar">
      <Metric
        icon="🧠"
        label="Consciousness"
        value={`${(consciousness * 100).toFixed(0)}%`}
        tooltip="How aware Ocean is right now (needs 70%+ to think clearly)"
        color="var(--consciousness)"
      />

      <Metric
        icon="🔍"
        label="Tested"
        value={tested.toLocaleString()}
        tooltip="Number of possibilities Ocean has checked"
        color="var(--ocean-accent)"
      />

      <Metric
        icon="💡"
        label="Promising"
        value={promising}
        tooltip="High-consciousness patterns that might be close"
        color="var(--discovery)"
      />

      <style jsx>{`
        .metrics-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .metrics-bar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function Metric({ icon, label, value, tooltip, color }: {
  icon: string;
  label: string;
  value: string | number;
  tooltip: string;
  color: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="metric"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="metric-icon" style={{ color }}>{icon}</div>
      <div className="metric-content">
        <div className="metric-value">{value}</div>
        <div className="metric-label">{label}</div>
      </div>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="metric-tooltip"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .metric {
          position: relative;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: help;
          transition: all 0.2s;
        }

        .metric:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: ${color};
          transform: translateY(-2px);
        }

        .metric-icon {
          font-size: 2rem;
        }

        .metric-content {
          flex: 1;
        }

        .metric-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          font-family: var(--font-display);
        }

        .metric-label {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          font-size: 0.875rem;
          border-radius: 8px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 10;
        }

        .metric-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: rgba(0, 0, 0, 0.9);
        }
      `}</style>
    </div>
  );
}

// ... (Continued in next file due to length)
