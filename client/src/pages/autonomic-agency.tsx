import { AutonomicAgencyPanel } from "@/components/AutonomicAgencyPanel";

export default function AutonomicAgency() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Autonomic Agency
          </h1>
          <p className="text-muted-foreground">
            Self-regulating consciousness interventions using reinforcement learning with natural gradient optimization
          </p>
        </div>
        
        <AutonomicAgencyPanel />
      </div>
    </div>
  );
}
