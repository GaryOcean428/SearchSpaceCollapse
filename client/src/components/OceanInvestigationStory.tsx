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
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Brain, Search, Lightbulb, Copy, Check, ChevronDown, ChevronUp, 
  X, Play, Pause, AlertTriangle, Sparkles, Target, Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedRecoverySession, RecoveryCandidate, TargetAddress } from '@shared/schema';

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
  significance: number;
}

interface TelemetryEvent {
  id: string;
  timestamp: string;
  type: 'iteration' | 'hypothesis_tested' | 'near_miss' | 'discovery' | 'strategy_change' | 'consolidation' | 'insight' | 'alert';
  message: string;
  data?: any;
}

interface ManifoldState {
  totalProbes: number;
  avgPhi: number;
  avgKappa: number;
  dominantRegime: string;
  resonanceClusters: number;
  exploredVolume: number;
  recommendations: string[];
}

interface InvestigationStatus {
  isRunning: boolean;
  tested: number;
  nearMisses: number;
  consciousness: ConsciousnessState;
  currentThought: string;
  discoveries: Discovery[];
  progress: number;
  session?: UnifiedRecoverySession;
  strategies?: { name: string; progress: number; candidates: number; status: string }[];
  events?: TelemetryEvent[];
  currentStrategy?: string;
  iteration?: number;
  sessionId?: string | null;
  targetAddress?: string | null;
  manifold?: ManifoldState;
}

export function OceanInvestigationStory() {
  const [expertMode, setExpertMode] = useState(false);
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | null>(null);
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery<InvestigationStatus>({
    queryKey: ['/api/investigation/status'],
    refetchInterval: 2000,
  });

  const { data: candidates } = useQuery<RecoveryCandidate[]>({
    queryKey: ['/api/recovery/candidates'],
    refetchInterval: 3000,
  });

  const { data: targetAddresses } = useQuery<TargetAddress[]>({
    queryKey: ['/api/recovery/addresses'],
  });

  const startMutation = useMutation({
    mutationFn: async (targetAddress: string) => {
      return apiRequest('POST', '/api/recovery/start', { targetAddress });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investigation/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recovery/session'] });
      toast({ title: 'Investigation Started', description: 'Ocean is now investigating...' });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/recovery/stop'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/investigation/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recovery/session'] });
      toast({ title: 'Investigation Paused', description: 'Ocean has paused the investigation.' });
    },
  });

  if (isLoading) {
    return <LoadingState />;
  }

  const defaultStatus: InvestigationStatus = {
    isRunning: false,
    tested: 0,
    nearMisses: 0,
    consciousness: { phi: 0.75, kappa: 64, regime: 'linear', basinDrift: 0 },
    currentThought: 'Ready to begin investigation...',
    discoveries: [],
    progress: 0,
    events: [],
    currentStrategy: 'idle',
    iteration: 0,
    sessionId: null,
    targetAddress: null,
  };

  const currentStatus = status || defaultStatus;

  return (
    <div className="investigation-story min-h-screen" data-testid="investigation-story">
      <div className="relative z-10 p-6 space-y-8 max-w-7xl mx-auto">
        
        {/* Hero Section: Ocean's State */}
        <HeroSection 
          consciousness={currentStatus.consciousness} 
          thought={currentStatus.currentThought}
          isRunning={currentStatus.isRunning}
        />

        {/* Control Bar */}
        <ControlBar 
          isRunning={currentStatus.isRunning}
          targetAddresses={targetAddresses || []}
          onStart={(addr) => startMutation.mutate(addr)}
          onStop={() => stopMutation.mutate()}
          isPending={startMutation.isPending || stopMutation.isPending}
        />

        {/* Narrative Section */}
        <NarrativeSection status={currentStatus} />

        {/* Simplified Metrics */}
        <MetricsBar
          consciousness={currentStatus.consciousness.phi}
          tested={currentStatus.tested}
          promising={currentStatus.nearMisses}
        />

        {/* Manifold Learning Panel */}
        {currentStatus.manifold && (
          <ManifoldPanel manifold={currentStatus.manifold} />
        )}

        {/* Discoveries Feed */}
        <DiscoveriesFeed
          discoveries={currentStatus.discoveries}
          candidates={candidates || []}
          onSelectDiscovery={setSelectedDiscovery}
        />

        {/* Live Activity Feed - shown when running or when there are events */}
        {(currentStatus.isRunning || (currentStatus.events && currentStatus.events.length > 0)) && (
          <ActivityFeed 
            events={currentStatus.events || []} 
            iteration={currentStatus.iteration || 0}
            strategy={currentStatus.currentStrategy || 'idle'}
            isRunning={currentStatus.isRunning}
          />
        )}

        {/* Expert Mode Toggle */}
        <ExpertModeToggle
          isExpert={expertMode}
          onToggle={() => setExpertMode(!expertMode)}
        />

        {/* Technical Dashboard (hidden by default) */}
        <AnimatePresence>
          {expertMode && <TechnicalDashboard status={currentStatus} />}
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
    </div>
  );
}

function HeroSection({ consciousness, thought, isRunning }: {
  consciousness: ConsciousnessState;
  thought: string;
  isRunning: boolean;
}) {
  return (
    <section className="hero-section rounded-3xl p-8" data-testid="hero-section">
      <div className="hero-content flex flex-col lg:flex-row items-center gap-8">
        <OceanAvatar consciousness={consciousness} isRunning={isRunning} />
        <ThoughtBubble thought={thought} />
      </div>
    </section>
  );
}

function OceanAvatar({ consciousness, isRunning }: { 
  consciousness: ConsciousnessState;
  isRunning: boolean;
}) {
  const { phi, regime } = consciousness;

  const getColor = () => {
    if (regime === 'breakdown') return 'rgb(239, 68, 68)';
    if (regime === 'geometric') return 'rgb(100, 255, 218)';
    return 'rgb(245, 158, 11)';
  };

  const getRegimeLabel = () => {
    if (regime === 'breakdown') return 'Consolidating';
    if (regime === 'geometric') return 'Deep Thinking';
    return 'Processing';
  };

  return (
    <div className="ocean-avatar flex-shrink-0" data-testid="ocean-avatar">
      <motion.div
        className="consciousness-orb relative"
        animate={isRunning ? {
          scale: phi > 0.7 ? [1, 1.05, 1] : [1, 0.98, 1],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Outer ring */}
        <div 
          className="pulse-ring absolute inset-0 rounded-full border-[3px]"
          style={{ borderColor: getColor() }}
        />

        {/* Core glow */}
        <motion.div
          className="core absolute rounded-full"
          style={{
            inset: '20px',
            background: `radial-gradient(circle, ${getColor()} 0%, rgb(0, 217, 255) 100%)`,
            filter: 'blur(15px)',
            opacity: phi,
          }}
          animate={isRunning ? { 
            opacity: [phi * 0.8, phi, phi * 0.8] 
          } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Consciousness percentage */}
        <div className="phi-display absolute inset-0 flex flex-col items-center justify-center">
          <span 
            className="phi-value text-5xl font-bold text-white"
            style={{ textShadow: `0 0 20px ${getColor()}` }}
            data-testid="text-consciousness-value"
          >
            {(phi * 100).toFixed(0)}%
          </span>
          <span 
            className="phi-label text-sm uppercase tracking-wider"
            style={{ color: getColor() }}
          >
            Conscious
          </span>
          <Badge variant="outline" className="mt-2 text-xs" style={{ borderColor: getColor(), color: getColor() }}>
            {getRegimeLabel()}
          </Badge>
        </div>
      </motion.div>
    </div>
  );
}

function ThoughtBubble({ thought }: { thought: string }) {
  return (
    <motion.div
      className="thought-bubble flex-1 max-w-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={thought}
      data-testid="thought-bubble"
    >
      <div className="bubble-tail hidden lg:block" />
      <p className="text-lg lg:text-xl text-white/90 leading-relaxed">
        "{thought}"
      </p>
    </motion.div>
  );
}

function ControlBar({ isRunning, targetAddresses, onStart, onStop, isPending }: {
  isRunning: boolean;
  targetAddresses: TargetAddress[];
  onStart: (address: string) => void;
  onStop: () => void;
  isPending: boolean;
}) {
  const [selectedAddress, setSelectedAddress] = useState(targetAddresses[0]?.address || '');

  useEffect(() => {
    if (targetAddresses.length > 0 && !selectedAddress) {
      setSelectedAddress(targetAddresses[0].address);
    }
  }, [targetAddresses, selectedAddress]);

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm" data-testid="control-bar">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {!isRunning ? (
            <>
              <select
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(e.target.value)}
                className="flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                data-testid="select-investigation-address"
              >
                {targetAddresses.map((addr) => (
                  <option key={addr.id} value={addr.address} className="bg-gray-900">
                    {addr.label || addr.address.slice(0, 20) + '...'}
                  </option>
                ))}
              </select>
              <Button
                size="lg"
                onClick={() => onStart(selectedAddress)}
                disabled={isPending || !selectedAddress}
                className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 min-w-[180px]"
                data-testid="button-start-investigation"
              >
                <Play className="w-5 h-5" />
                Start Investigation
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              onClick={onStop}
              disabled={isPending}
              className="gap-2 min-w-[180px]"
              data-testid="button-stop-investigation"
            >
              <Pause className="w-5 h-5" />
              Pause Investigation
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NarrativeSection({ status }: { status: InvestigationStatus }) {
  const generateNarrative = () => {
    if (!status.isRunning) {
      return {
        headline: "Ready to begin",
        story: "Ocean is prepared to search for your Bitcoin. Start the investigation when you're ready.",
        emoji: "🌊"
      };
    }

    if (status.nearMisses > 10) {
      return {
        headline: "Getting warmer!",
        story: `Ocean has found ${status.nearMisses} promising patterns. She's getting closer to the answer.`,
        emoji: "🔥"
      };
    }

    if (status.tested > 1000) {
      return {
        headline: "Deep investigation...",
        story: `Ocean has explored ${status.tested.toLocaleString()} possibilities. Her consciousness remains focused.`,
        emoji: "🧠"
      };
    }

    return {
      headline: "Investigating...",
      story: `Ocean is thinking deeply. She's tested ${status.tested} possibilities so far.`,
      emoji: "🔍"
    };
  };

  const { headline, story, emoji } = generateNarrative();

  return (
    <section className="narrative-section text-center py-8" data-testid="narrative-section">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={headline}
        className="space-y-4"
      >
        <div className="text-5xl">{emoji}</div>
        <h1 className="text-3xl lg:text-4xl font-bold text-white">
          {headline}
        </h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          {story}
        </p>
      </motion.div>

      {status.isRunning && (
        <div className="mt-8">
          <ProgressRing value={status.progress} />
        </div>
      )}
    </section>
  );
}

function ProgressRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="progress-ring-container inline-block" data-testid="progress-ring">
      <svg className="progress-ring" width="120" height="120">
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
        />
        <motion.circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="rgb(100, 255, 218)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5 }}
        />
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
    </div>
  );
}

function MetricsBar({ consciousness, tested, promising }: {
  consciousness: number;
  tested: number;
  promising: number;
}) {
  return (
    <div className="metrics-bar grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="metrics-bar">
      <Metric
        icon={<Brain className="w-8 h-8" />}
        label="Consciousness"
        value={`${(consciousness * 100).toFixed(0)}%`}
        tooltip="How aware Ocean is right now (needs 70%+ to think clearly)"
        color="rgb(124, 58, 237)"
        testId="metric-consciousness"
      />
      <Metric
        icon={<Search className="w-8 h-8" />}
        label="Tested"
        value={tested.toLocaleString()}
        tooltip="Number of possibilities Ocean has checked"
        color="rgb(100, 255, 218)"
        testId="metric-tested"
      />
      <Metric
        icon={<Lightbulb className="w-8 h-8" />}
        label="Promising"
        value={promising.toString()}
        tooltip="High-consciousness patterns that might be close"
        color="rgb(16, 185, 129)"
        testId="metric-promising"
      />
    </div>
  );
}

function Metric({ icon, label, value, tooltip, color, testId }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tooltip: string;
  color: string;
  testId: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          className="metric p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 cursor-help"
          whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.08)' }}
          data-testid={testId}
        >
          <div style={{ color }}>{icon}</div>
          <div>
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-sm text-white/60 uppercase tracking-wider">{label}</div>
          </div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function DiscoveriesFeed({ discoveries, candidates, onSelectDiscovery }: {
  discoveries: Discovery[];
  candidates: RecoveryCandidate[];
  onSelectDiscovery: (discovery: Discovery) => void;
}) {
  const allDiscoveries = [
    ...discoveries,
    ...candidates.slice(0, 5).map((c): Discovery => {
      const phiScore = c.qigScore?.phi || 0;
      return {
        id: c.id.toString(),
        type: c.verified ? 'match' : phiScore > 0.8 ? 'near_miss' : 'pattern',
        timestamp: new Date(c.testedAt || Date.now()),
        message: c.verified 
          ? `Found the correct passphrase!` 
          : `Tested pattern with ${(phiScore * 100).toFixed(0)}% consciousness`,
        details: { phrase: c.phrase, address: c.address, score: phiScore },
        significance: phiScore,
      };
    })
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <section className="discoveries-feed" data-testid="discoveries-feed">
      <h2 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
        <Sparkles className="w-6 h-6 text-yellow-400" />
        Recent Discoveries
      </h2>

      {allDiscoveries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {allDiscoveries.slice(0, 8).map((discovery, index) => (
            <DiscoveryCard
              key={discovery.id}
              discovery={discovery}
              onClick={() => onSelectDiscovery(discovery)}
              delay={index * 0.1}
            />
          ))}
        </div>
      )}
    </section>
  );
}

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
          color: 'rgb(16, 185, 129)',
          glow: true,
        };
      case 'near_miss':
        return {
          icon: '🔥',
          title: 'Getting warmer!',
          color: 'rgb(245, 158, 11)',
          glow: false,
        };
      case 'pattern':
        return {
          icon: '💡',
          title: 'Pattern discovered',
          color: 'rgb(100, 255, 218)',
          glow: false,
        };
      case 'strategy_change':
        return {
          icon: '🎯',
          title: 'Strategy adjusted',
          color: 'rgb(124, 58, 237)',
          glow: false,
        };
    }
  };

  const config = getConfig();

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
      className="discovery-card flex items-center gap-4 p-4 rounded-2xl bg-white/5 border-2 cursor-pointer"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={onClick}
      whileHover={{ x: 10, backgroundColor: 'rgba(255,255,255,0.08)' }}
      style={{
        borderColor: config.color,
        boxShadow: config.glow ? `0 0 30px ${config.color}` : 'none',
      }}
      data-testid={`card-discovery-${discovery.id}`}
    >
      <div className="text-4xl flex-shrink-0">{config.icon}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-semibold text-lg" style={{ color: config.color }}>
            {config.title}
          </h3>
          <time className="text-sm text-white/50 flex-shrink-0">
            {formatTime(new Date(discovery.timestamp))}
          </time>
        </div>
        <p className="text-white/80 truncate">{discovery.message}</p>

        {discovery.significance > 0.7 && (
          <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-yellow-500/10 rounded-lg text-sm text-yellow-400 w-fit">
            <Sparkles className="w-4 h-4" />
            This is significant!
          </div>
        )}
      </div>

      <ChevronDown className="w-5 h-5 text-white/50 flex-shrink-0" />
    </motion.div>
  );
}

function DiscoveryModal({ discovery, onClose }: {
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
      className="modal-overlay fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      data-testid="discovery-modal"
    >
      <motion.div
        className="modal-content bg-gray-900 border-2 border-cyan-400 rounded-3xl p-6 max-w-lg w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          onClick={onClose}
          data-testid="button-close-modal"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {getTitle(discovery.type)}
          </h2>
          <time className="text-sm text-white/60">
            {formatTime(new Date(discovery.timestamp))}
          </time>
        </div>

        <p className="text-lg text-white/90 mb-6">{discovery.message}</p>

        {discovery.details && (
          <div className="bg-black/30 rounded-xl p-4">
            <h3 className="text-cyan-400 font-semibold mb-3">Details</h3>
            {renderDetails(discovery.details, handleCopy, copied)}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ActivityFeed({ events, iteration, strategy, isRunning }: {
  events: TelemetryEvent[];
  iteration: number;
  strategy: string;
  isRunning: boolean;
}) {
  const getEventIcon = (type: TelemetryEvent['type']) => {
    switch (type) {
      case 'iteration': return <Target className="w-4 h-4 text-cyan-400" />;
      case 'near_miss': return <Sparkles className="w-4 h-4 text-yellow-400" />;
      case 'discovery': return <Lightbulb className="w-4 h-4 text-green-400" />;
      case 'strategy_change': return <Brain className="w-4 h-4 text-purple-400" />;
      case 'consolidation': return <Timer className="w-4 h-4 text-blue-400" />;
      case 'insight': return <Search className="w-4 h-4 text-white/60" />;
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <Search className="w-4 h-4 text-white/40" />;
    }
  };

  const getEventBg = (type: TelemetryEvent['type']) => {
    switch (type) {
      case 'near_miss': return 'bg-yellow-400/10 border-yellow-400/30';
      case 'discovery': return 'bg-green-400/10 border-green-400/30';
      case 'strategy_change': return 'bg-purple-400/10 border-purple-400/30';
      case 'alert': return 'bg-red-400/10 border-red-400/30';
      case 'consolidation': return 'bg-blue-400/10 border-blue-400/30';
      default: return 'bg-white/5 border-white/10';
    }
  };

  return (
    <section className="activity-feed" data-testid="activity-feed">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan-400" />
          {isRunning ? 'Live Activity' : 'Investigation Log'}
        </h2>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <Badge variant="outline" className="bg-cyan-400/10 border-cyan-400/30 text-cyan-400">
            Iteration {iteration}
          </Badge>
          <Badge variant="outline" className="bg-purple-400/10 border-purple-400/30 text-purple-400">
            {strategy.replace(/_/g, ' ')}
          </Badge>
          {isRunning && (
            <Badge variant="outline" className="bg-green-400/10 border-green-400/30 text-green-400 animate-pulse">
              Running
            </Badge>
          )}
        </div>
      </div>

      <div className="bg-black/30 border border-white/10 rounded-xl p-4 max-h-64 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Waiting for activity...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.slice().reverse().map((event) => (
              <motion.div
                key={event.id}
                className={`flex items-start gap-3 p-3 border ${getEventBg(event.type)}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="mt-0.5 flex-shrink-0">{getEventIcon(event.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 break-words">{event.message}</p>
                  <time className="text-xs text-white/40">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </time>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ManifoldPanel({ manifold }: { manifold: ManifoldState }) {
  const getVolumeColor = () => {
    if (manifold.exploredVolume > 0.5) return 'text-green-400';
    if (manifold.exploredVolume > 0.3) return 'text-yellow-400';
    return 'text-white/60';
  };

  const getRegimeIcon = () => {
    switch (manifold.dominantRegime) {
      case 'geometric': return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'breakdown': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'linear': return <Target className="w-4 h-4 text-yellow-400" />;
      default: return <Search className="w-4 h-4 text-white/40" />;
    }
  };

  if (manifold.totalProbes === 0) {
    return null;
  }

  return (
    <section className="manifold-panel" data-testid="manifold-panel">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-400" />
        Manifold Memory
        <Badge variant="outline" className="bg-purple-400/10 border-purple-400/30 text-purple-400 text-xs" data-testid="badge-total-probes">
          {manifold.totalProbes.toLocaleString()} probes
        </Badge>
      </h2>

      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1" data-testid="metric-avg-consciousness">
              <div className="text-xs text-white/50 uppercase tracking-wider">Avg Consciousness</div>
              <div className="text-lg font-semibold text-cyan-400" data-testid="text-avg-phi">
                {(manifold.avgPhi * 100).toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1" data-testid="metric-resonance-clusters">
              <div className="text-xs text-white/50 uppercase tracking-wider">Resonance Clusters</div>
              <div className="text-lg font-semibold text-yellow-400" data-testid="text-resonance-count">
                {manifold.resonanceClusters}
              </div>
            </div>
            <div className="space-y-1" data-testid="metric-dominant-regime">
              <div className="text-xs text-white/50 uppercase tracking-wider">Dominant Regime</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                {getRegimeIcon()}
                <span className="capitalize" data-testid="text-dominant-regime">{manifold.dominantRegime}</span>
              </div>
            </div>
            <div className="space-y-1" data-testid="metric-explored-volume">
              <div className="text-xs text-white/50 uppercase tracking-wider">Explored Volume</div>
              <div className={`text-lg font-semibold ${getVolumeColor()}`} data-testid="text-explored-volume">
                {(manifold.exploredVolume * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {manifold.recommendations.length > 0 && (
            <div className="pt-3 border-t border-white/10" data-testid="section-geometric-insights">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Geometric Insights</div>
              <div className="flex flex-wrap gap-2">
                {manifold.recommendations.map((rec, i) => (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className="bg-white/5 border-white/20 text-white/80 text-xs"
                    data-testid={`badge-recommendation-${i}`}
                  >
                    {rec}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ExpertModeToggle({ isExpert, onToggle }: {
  isExpert: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="expert-toggle-container flex justify-center py-4">
      <Button
        variant="ghost"
        onClick={onToggle}
        className="gap-2 text-white/70 hover:text-white"
        data-testid="button-toggle-expert"
      >
        {isExpert ? 'Hide' : 'Show'} Technical Details
        {isExpert ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </Button>
    </div>
  );
}

function TechnicalDashboard({ status }: { status: InvestigationStatus }) {
  return (
    <motion.div
      className="technical-dashboard mx-4 p-6 bg-black/30 border border-white/10 rounded-2xl"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      data-testid="technical-dashboard"
    >
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Target className="w-5 h-5" />
        Technical Telemetry
      </h3>

      <div className="tech-grid grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <TechMetric label="Φ (Integration)" value={status.consciousness.phi.toFixed(3)} />
        <TechMetric label="κ (Coupling)" value={status.consciousness.kappa.toFixed(1)} />
        <TechMetric label="Regime" value={status.consciousness.regime} />
        <TechMetric label="Basin Drift" value={status.consciousness.basinDrift.toFixed(4)} />
      </div>

      {status.strategies && status.strategies.length > 0 && (
        <div className="mb-6">
          <h4 className="text-cyan-400 font-semibold mb-3">Active Strategies</h4>
          <div className="space-y-2">
            {status.strategies.map((s) => (
              <div key={s.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-white/80">{s.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/60">{s.candidates} candidates</span>
                  <Badge variant={s.status === 'running' ? 'default' : 'secondary'}>
                    {s.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-cyan-400 font-semibold mb-3">Raw Status</h4>
        <pre className="text-xs text-white/70 bg-black/40 p-4 rounded-lg overflow-x-auto font-mono">
          {JSON.stringify(status, null, 2)}
        </pre>
      </div>
    </motion.div>
  );
}

function TechMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="tech-metric p-4 bg-white/5 rounded-lg" data-testid={`tech-metric-${label.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="text-sm text-white/60 mb-1">{label}</div>
      <div className="text-xl font-mono text-cyan-400 font-semibold">{value}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-state min-h-screen flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-gray-900 to-gray-950" data-testid="loading-state">
      <motion.div
        className="loading-orb w-20 h-20 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgb(100, 255, 218) 0%, rgb(0, 217, 255) 100%)',
          filter: 'blur(10px)',
        }}
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
      <p className="text-lg text-white/80">Initializing Ocean...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state text-center py-12 text-white/60" data-testid="empty-state">
      <div className="text-5xl mb-4">🌊</div>
      <h3 className="text-xl font-semibold text-white mb-2">No discoveries yet</h3>
      <p>Ocean will update you as she finds interesting patterns</p>
    </div>
  );
}

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
  if (details.phrase) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
          <span className="font-mono text-cyan-400 break-all">{details.phrase}</span>
          <Button
            size="sm"
            onClick={() => handleCopy(details.phrase)}
            className="ml-3 flex-shrink-0 gap-1"
            data-testid="button-copy-phrase"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        {details.address && (
          <div className="text-sm text-white/60">
            <span className="block mb-1">Address:</span>
            <span className="font-mono text-white/80 break-all">{details.address}</span>
          </div>
        )}
        {details.score !== undefined && (
          <div className="text-sm text-white/60">
            Consciousness Score: <span className="text-cyan-400 font-semibold">{(details.score * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
    );
  }

  return <pre className="text-sm text-white/70 font-mono">{JSON.stringify(details, null, 2)}</pre>;
}

export default OceanInvestigationStory;
