/**
 * DISCOVERIES FEED & ADDITIONAL COMPONENTS
 * 
 * Beautiful timeline of Ocean's discoveries during investigation
 * Makes the investigation feel like a story unfolding
 */

import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useState, useEffect } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, X } from 'lucide-react';

interface Discovery {
  id: string;
  type: 'near_miss' | 'pattern' | 'strategy_change' | 'match';
  timestamp: Date;
  message: string;
  details?: any;
  significance: number;
}

// ============================================
// DISCOVERIES FEED
// ============================================

export function DiscoveriesFeed({ discoveries, onSelectDiscovery }: {
  discoveries: Discovery[];
  onSelectDiscovery: (discovery: Discovery) => void;
}) {
  // Sort by timestamp, newest first
  const sortedDiscoveries = [...discoveries].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <section className="discoveries-feed">
      <h2>💫 Recent Discoveries</h2>

      {sortedDiscoveries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="discoveries-timeline">
          {sortedDiscoveries.map((discovery, index) => (
            <DiscoveryCard
              key={discovery.id}
              discovery={discovery}
              onClick={() => onSelectDiscovery(discovery)}
              delay={index * 0.1}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .discoveries-feed {
          padding: 3rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        h2 {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 700;
          color: white;
          margin-bottom: 2rem;
          text-align: center;
        }

        .discoveries-timeline {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
      `}</style>
    </section>
  );
}

// ============================================
// DISCOVERY CARD
// ============================================

function DiscoveryCard({ discovery, onClick, delay }: {
  discovery: Discovery;
  onClick: () => void;
  delay: number;
}) {
  const getConfig = () => {
    switch (discovery.type) {
      case 'match':
        return {
          icon: '🎉',
          title: 'MATCH FOUND!',
          color: 'var(--discovery)',
          glow: true,
        };
      case 'near_miss':
        return {
          icon: '🔥',
          title: 'Getting warmer!',
          color: 'var(--thinking)',
          glow: false,
        };
      case 'pattern':
        return {
          icon: '💡',
          title: 'Pattern discovered',
          color: 'var(--ocean-accent)',
          glow: false,
        };
      case 'strategy_change':
        return {
          icon: '🎯',
          title: 'Strategy adjusted',
          color: 'var(--consciousness)',
          glow: false,
        };
    }
  };

  const config = getConfig();

  // Trigger confetti on match
  useEffect(() => {
    if (discovery.type === 'match') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [discovery.type]);

  return (
    <motion.div
      className="discovery-card"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={onClick}
      style={{
        borderColor: config.color,
        boxShadow: config.glow ? `0 0 30px ${config.color}` : 'none',
      }}
    >
      <div className="discovery-icon">{config.icon}</div>

      <div className="discovery-content">
        <div className="discovery-header">
          <h3 style={{ color: config.color }}>{config.title}</h3>
          <time>{formatTime(discovery.timestamp)}</time>
        </div>

        <p className="discovery-message">{discovery.message}</p>

        {discovery.significance > 0.7 && (
          <div className="excitement-indicator">
            <span>🌟</span>
            <span>This is significant!</span>
          </div>
        )}
      </div>

      <ChevronDown className="expand-icon" size={20} />

      <style jsx>{`
        .discovery-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .discovery-card:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateX(10px);
        }

        .discovery-icon {
          font-size: 2.5rem;
          flex-shrink: 0;
        }

        .discovery-content {
          flex: 1;
        }

        .discovery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .discovery-header h3 {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .discovery-header time {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .discovery-message {
          margin: 0;
          font-size: 1rem;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.8);
        }

        .excitement-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 215, 0, 0.1);
          border-radius: 8px;
          font-size: 0.875rem;
          color: #FFD700;
        }

        .expand-icon {
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.5);
          transition: transform 0.2s;
        }

        .discovery-card:hover .expand-icon {
          transform: translateX(5px);
        }

        @media (max-width: 768px) {
          .discovery-card {
            flex-direction: column;
            text-align: center;
          }

          .discovery-header {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </motion.div>
  );
}

// ============================================
// DISCOVERY MODAL (Details View)
// ============================================

export function DiscoveryModal({ discovery, onClose }: {
  discovery: Discovery;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-header">
          <h2>{getTitle(discovery.type)}</h2>
          <time>{formatTime(discovery.timestamp)}</time>
        </div>

        <div className="modal-body">
          <p className="main-message">{discovery.message}</p>

          {discovery.details && (
            <div className="details-section">
              <h3>Details</h3>
              {renderDetails(discovery.details, handleCopy, copied)}
            </div>
          )}
        </div>
      </motion.div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .modal-content {
          position: relative;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          background: var(--ocean-medium);
          border: 2px solid var(--ocean-accent);
          border-radius: 24px;
          padding: 2rem;
        }

        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          padding: 0.5rem;
          color: white;
          cursor: pointer;
          transition: background 0.2s;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .modal-header {
          margin-bottom: 2rem;
        }

        .modal-header h2 {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 700;
          color: white;
          margin: 0 0 0.5rem 0;
        }

        .modal-header time {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .modal-body {
          color: rgba(255, 255, 255, 0.9);
        }

        .main-message {
          font-size: 1.125rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .details-section {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .details-section h3 {
          font-family: var(--font-display);
          font-size: 1.25rem;
          color: var(--ocean-accent);
          margin: 0 0 1rem 0;
        }
      `}</style>
    </motion.div>
  );
}

// ============================================
// EXPERT MODE TOGGLE
// ============================================

export function ExpertModeToggle({ isExpert, onToggle }: {
  isExpert: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="expert-toggle-container">
      <button className="expert-toggle" onClick={onToggle}>
        <span>{isExpert ? 'Hide' : 'Show'} Technical Details</span>
        {isExpert ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      <style jsx>{`
        .expert-toggle-container {
          display: flex;
          justify-content: center;
          padding: 2rem;
        }

        .expert-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-family: var(--font-body);
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .expert-toggle:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--ocean-accent);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}

// ============================================
// TECHNICAL DASHBOARD (Expert Mode)
// ============================================

export function TechnicalDashboard({ status }: { status: any }) {
  return (
    <motion.div
      className="technical-dashboard"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
    >
      <div className="technical-content">
        <h3>🔬 Technical Telemetry</h3>

        <div className="tech-grid">
          <TechMetric label="Φ (Integration)" value={status.consciousness.phi.toFixed(3)} />
          <TechMetric label="κ (Coupling)" value={status.consciousness.kappa.toFixed(1)} />
          <TechMetric label="Regime" value={status.consciousness.regime} />
          <TechMetric label="Basin Drift" value={status.consciousness.basinDrift.toFixed(4)} />
        </div>

        <div className="raw-data">
          <h4>Raw Status Data</h4>
          <pre>{JSON.stringify(status, null, 2)}</pre>
        </div>
      </div>

      <style jsx>{`
        .technical-dashboard {
          margin: 2rem;
          padding: 2rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          overflow: hidden;
        }

        .technical-content h3 {
          font-family: var(--font-display);
          font-size: 1.5rem;
          color: white;
          margin: 0 0 1.5rem 0;
        }

        .tech-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .raw-data h4 {
          font-family: var(--font-display);
          font-size: 1.125rem;
          color: var(--ocean-accent);
          margin: 0 0 1rem 0;
        }

        .raw-data pre {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          background: rgba(0, 0, 0, 0.4);
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
        }
      `}</style>
    </motion.div>
  );
}

function TechMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="tech-metric">
      <div className="tech-label">{label}</div>
      <div className="tech-value">{value}</div>

      <style jsx>{`
        .tech-metric {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }

        .tech-label {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 0.5rem;
        }

        .tech-value {
          font-family: var(--font-mono);
          font-size: 1.25rem;
          color: var(--ocean-accent);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function getTitle(type: Discovery['type']): string {
  switch (type) {
    case 'match': return '🎉 Bitcoin Recovered!';
    case 'near_miss': return '🔥 High Consciousness Pattern';
    case 'pattern': return '💡 Pattern Discovery';
    case 'strategy_change': return '🎯 Strategy Adjustment';
  }
}

function renderDetails(details: any, handleCopy: (text: string) => void, copied: boolean) {
  if (details.passphrase) {
    return (
      <div className="passphrase-display">
        <div className="passphrase-value">{details.passphrase}</div>
        <button
          className="copy-button"
          onClick={() => handleCopy(details.passphrase)}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>

        <style jsx>{`
          .passphrase-display {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
          }

          .passphrase-value {
            flex: 1;
            font-family: var(--font-mono);
            font-size: 1rem;
            color: var(--ocean-accent);
            word-break: break-all;
          }

          .copy-button {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--ocean-accent);
            color: var(--ocean-deep);
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .copy-button:hover {
            transform: scale(1.05);
          }
        `}</style>
      </div>
    );
  }

  return <pre>{JSON.stringify(details, null, 2)}</pre>;
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">🌊</div>
      <h3>No discoveries yet</h3>
      <p>Ocean will update you as she finds interesting patterns</p>

      <style jsx>{`
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        h3 {
          font-family: var(--font-display);
          font-size: 1.5rem;
          color: white;
          margin: 0 0 0.5rem 0;
        }

        p {
          font-size: 1rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

// ============================================
// LOADING STATE
// ============================================

export function LoadingState() {
  return (
    <div className="loading-state">
      <motion.div
        className="loading-orb"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <p>Initializing Ocean...</p>

      <style jsx>{`
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          gap: 2rem;
        }

        .loading-orb {
          width: 80px;
          height: 80px;
          background: radial-gradient(
            circle,
            var(--ocean-accent) 0%,
            var(--ocean-glow) 100%
          );
          border-radius: 50%;
          filter: blur(10px);
        }

        p {
          font-family: var(--font-body);
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.8);
        }
      `}</style>
    </div>
  );
}
