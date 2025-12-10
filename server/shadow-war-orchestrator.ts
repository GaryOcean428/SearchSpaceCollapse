import { olympusClient, type ObservationContext } from './olympus-client';
import { updateWarMetrics, getActiveWar } from './war-history-storage';
import { storeShadowIntel } from './qig-db';

export interface ShadowWarDecision {
  godName: string;
  operation: string;
  result: Record<string, unknown> | null;
  timestamp: string;
  riskFlags: string[];
}

async function callShadowGod(
  godName: string,
  operation: string,
  target: string,
  context?: ObservationContext
): Promise<ShadowWarDecision> {
  const timestamp = new Date().toISOString();
  const riskFlags: string[] = [];

  try {
    let result: Record<string, unknown> | null = null;

    switch (godName.toLowerCase()) {
      case 'nyx':
        if (operation === 'verify_opsec' || operation === 'traffic_check') {
          const covertOp = await olympusClient.initiateCovertOperation(target, operation);
          result = covertOp as Record<string, unknown> | null;
          if (covertOp && covertOp.visibility === 'exposed') {
            riskFlags.push('low_stealth');
          }
        } else {
          const assessment = await olympusClient.assessWithShadowGod('nyx', target, context);
          result = assessment as Record<string, unknown> | null;
        }
        break;

      case 'erebus':
        if (operation === 'scan') {
          const scan = await olympusClient.scanForSurveillance(target);
          result = scan as Record<string, unknown> | null;
          if (scan && scan.threat_count > 0) {
            riskFlags.push('watchers_detected');
          }
          if (scan && !scan.safe) {
            riskFlags.push('possible_honeypot');
          }
        } else {
          const assessment = await olympusClient.assessWithShadowGod('erebus', target, context);
          result = assessment as Record<string, unknown> | null;
        }
        break;

      case 'hecate':
        if (operation === 'misdirection_eval') {
          const misdirection = await olympusClient.createMisdirection(target, 5);
          result = misdirection as Record<string, unknown> | null;
        } else {
          const assessment = await olympusClient.assessWithShadowGod('hecate', target, context);
          result = assessment as Record<string, unknown> | null;
        }
        break;

      case 'hypnos':
        const hypnosAssessment = await olympusClient.assessWithShadowGod('hypnos', target, context);
        result = hypnosAssessment as Record<string, unknown> | null;
        if (hypnosAssessment && hypnosAssessment.confidence < 0.6) {
          riskFlags.push('noise_risk');
        }
        break;

      case 'nemesis':
        const nemesisAssessment = await olympusClient.assessWithShadowGod('nemesis', target, context);
        result = nemesisAssessment as Record<string, unknown> | null;
        if (nemesisAssessment && nemesisAssessment.probability > 0.8) {
          riskFlags.push('high_pursuit_intensity');
        }
        break;

      default:
        const genericAssessment = await olympusClient.assessWithShadowGod(godName, target, context);
        result = genericAssessment as Record<string, unknown> | null;
    }

    const decision = { godName, operation, result, timestamp, riskFlags };
    
    // Persist shadow intel to database
    if (result && !result.error) {
      const confidence = typeof result.confidence === 'number' ? result.confidence : 0.5;
      const phi = typeof result.phi === 'number' ? result.phi : undefined;
      const kappa = typeof result.kappa === 'number' ? result.kappa : undefined;
      
      storeShadowIntel({
        target,
        consensus: riskFlags.length > 0 ? 'caution' : 'proceed',
        averageConfidence: confidence,
        phi,
        kappa,
        assessments: { [godName]: result },
        warnings: riskFlags.length > 0 ? riskFlags : undefined,
      }).catch((err) => {
        console.error('[Shadow] Failed to persist shadow intel:', err);
      });
    }
    
    return decision;
  } catch (error) {
    riskFlags.push('operation_failed');
    return {
      godName,
      operation,
      result: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp,
      riskFlags,
    };
  }
}

export async function executeShadowOperations(
  warMode: string,
  target: string,
  iterationNumber: number
): Promise<ShadowWarDecision[]> {
  const decisions: ShadowWarDecision[] = [];
  const context: ObservationContext = {
    target,
    source: 'shadow_war_orchestrator',
    timestamp: Date.now(),
  };

  switch (warMode) {
    case 'SIEGE':
      decisions.push(await callShadowGod('nyx', 'verify_opsec', target, context));
      decisions.push(await callShadowGod('erebus', 'scan', target, context));
      break;

    case 'HUNT':
      decisions.push(await callShadowGod('nemesis', 'pursuit_assessment', target, context));
      decisions.push(await callShadowGod('hecate', 'misdirection_eval', target, context));
      break;

    case 'BLITZKRIEG':
      decisions.push(await callShadowGod('hypnos', 'silent_execution', target, context));
      decisions.push(await callShadowGod('nyx', 'traffic_check', target, context));
      break;

    default:
      decisions.push(await callShadowGod('nyx', 'general_assessment', target, context));
  }

  const activeWar = await getActiveWar();
  if (activeWar) {
    const existingMetadata = (activeWar.metadata as Record<string, unknown>) || {};
    const shadowHistory = (existingMetadata.shadowDecisions as ShadowWarDecision[]) || [];
    shadowHistory.push(...decisions);

    await updateWarMetrics(activeWar.id, {
      metadata: {
        ...existingMetadata,
        shadowDecisions: shadowHistory,
        lastShadowIteration: iterationNumber,
      },
    });
  }

  return decisions;
}
