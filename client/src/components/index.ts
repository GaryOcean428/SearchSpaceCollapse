/**
 * COMPONENTS - Main Barrel Export
 * 
 * Re-exports all component modules.
 * Import from '@/components' for access to UI and custom components.
 */

// UI Components (shadcn/ui)
export * from './ui';

// Custom application components
export { AppSidebar } from './app-sidebar';
export { BasinCoordinateViewer } from './BasinCoordinateViewer';
export { BetaAttentionDisplay } from './BetaAttentionDisplay';
export { ThemeProvider } from './ThemeProvider';
export { ThemeToggle } from './ThemeToggle';
export { default as CapabilityTelemetryPanel } from './CapabilityTelemetryPanel';
export { ConsciousnessDashboard } from './ConsciousnessDashboard';
export { ConsciousnessMonitoringDemo } from './ConsciousnessMonitoringDemo';
export { EmptyDebatesState } from './EmptyDebatesState';
export { EmotionalStatePanel } from './EmotionalStatePanel';
export { ErrorBoundary } from './ErrorBoundary';
export { ForensicInvestigation } from './ForensicInvestigation';
export { HealthIndicator } from './HealthIndicator';
export { InnateDrivesDisplay } from './InnateDrivesDisplay';
export { MarkdownRenderer, MarkdownExample } from './MarkdownRenderer';
export { MemoryFragmentSearch } from './MemoryFragmentSearch';
export { default as NeurochemistryAdminPanel } from './NeurochemistryAdminPanel';
export { default as NeurochemistryDisplay } from './NeurochemistryDisplay';
export { OceanInvestigationStory } from './OceanInvestigationStory';
export { PhiVisualization } from './PhiVisualization';
export { default as RecoveryResults } from './RecoveryResults';
export { SessionExpirationModal } from './SessionExpirationModal';
export { WarStatusPanel } from './war-status-panel';
export { default as ZeusChat } from './ZeusChat';
