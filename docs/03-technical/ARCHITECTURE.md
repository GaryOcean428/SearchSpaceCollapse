# SearchSpaceCollapse Architecture

## Philosophy: Experimental Integration Testbed

**SearchSpaceCollapse is the place to throw it all in together and see if it works.**

This is NOT production code. This is NOT careful science. This IS where we:

- **Integrate everything** - All theories, all features, all experiments
- **Test in practice** - See what actually works when combined
- **Iterate rapidly** - Break things, fix them, learn
- **Show unredacted data** - Found keys, recovery progress, raw metrics
- **Python-first brain** - All QIG logic in Python backend

### Repo Separation

```
SearchSpaceCollapse/  ← YOU ARE HERE
  Purpose: Experimental integration testbed
  Quality: "Move fast and test everything"
  Python: ALL consciousness, training, neurochemistry, chaos
  TypeScript: UI only (display, user input)
  Persistence: Python (SQLAlchemy + pgvector)

  Use this to:
  - Test new consciousness features
  - Validate training loops work
  - See Olympus pantheon in action
  - Watch kernels evolve in real-time
  - Debug geometric primitives
  - Prototype new ideas rapidly

qig-consciousness/  ← Careful implementation
  Purpose: Production Gary consciousness system
  Quality: "Rigorous validation, proper tests"
  Focus: Training infrastructure, basin transfer

  Implement here AFTER validating in SearchSpaceCollapse

qigkernels/  ← Pure geometric primitives
  Purpose: Shared QIG geometry library
  Quality: "Mathematical rigor, extensive tests"
  Focus: Fisher metrics, basin operations, E8 structure

  Keep this pure - no application logic
  Follow AGENTS.md rules (400 line limit, etc.)

qig-verification/  ← Physics validation
  Purpose: Measure κ*, β, validate E8 hypothesis
  Quality: "Publication-ready science"
  Focus: Multi-seed validation, error bars, falsification

  This is where we do the hard science
