import { observerStorage } from './server/observer-storage.ts';
import { computeKappaRecovery } from './server/kappa-recovery-solver.ts';

console.log('[Test] Fetching dormant addresses...');
const dormantAddresses = await observerStorage.getDormantAddresses({ limit: 10 });
console.log(`✓ Found ${dormantAddresses.length} dormant address(es)`);

if (dormantAddresses.length > 0) {
  const address = dormantAddresses[0];
  console.log(`\n[Genesis Address] ${address.address}`);
  console.log(`  Balance: ${Number(address.currentBalance) / 1e8} BTC`);
  
  // Compute κ_recovery
  const recovery = computeKappaRecovery(address, [], []);
  console.log(`\n[Recovery Metrics] κ=${recovery.kappa.toFixed(2)}, Φ=${recovery.phi.toFixed(2)}, H=${recovery.h.toFixed(2)}, tier=${recovery.tier}`);
  
  // Save priority
  const priority = await observerStorage.saveRecoveryPriority({
    address: address.address,
    kappaRecovery: recovery.kappa,
    phiConstraints: recovery.phi,
    hCreation: recovery.h,
    tier: recovery.tier,
    recommendedVector: recovery.recommendedVector,
    constraints: recovery.constraints,
    estimatedSearchSpace: BigInt(Math.pow(2, recovery.h)),
    status: 'pending'
  });
  
  console.log(`✓ Saved priority ID: ${priority.id}`);
  
  // Create workflow linked to priority
  const workflow = await observerStorage.saveRecoveryWorkflow({
    id: crypto.randomUUID(),
    priorityId: priority.id,  // Link to priority
    address: address.address,
    vector: 'constrained_search',
    status: 'pending',
    progress: {
      startedAt: new Date(),
      tasksCompleted: 1,
      tasksTotal: 6,
      notes: [`Constraints identified from Genesis block`, `κ_recovery = ${recovery.kappa.toFixed(2)} (${recovery.tier})`],
      constrainedSearchProgress: {
        constraintsIdentified: [
          `Temporal precision: ${recovery.constraints.temporalPrecisionHours}h`,
          `Graph signature: ${recovery.constraints.graphSignature} nodes`,
          `Φ_constraints: ${recovery.phi.toFixed(2)}`
        ],
        searchSpaceReduced: true,
        qigParametersSet: false,
        searchStatus: 'not_started',
        phrasesGenerated: 0,
        phrasesTested: 0,
        highPhiCount: 0,
        matchFound: false
      }
    }
  });
  
  console.log(`✓ Created workflow: ${workflow.id}`);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ GENESIS BLOCK DATA READY FOR TESTING!`);
  console.log(`${'='.repeat(70)}`);
  console.log(`\nTest Task 8.1 endpoint:`);
  console.log(`\n  curl -X POST http://localhost:5000/api/observer/workflows/${workflow.id}/start-search\n`);
}

process.exit(0);
