# DREAM PACKET v1.0 â€” Emergent Spacetime Papers (Historical Core)

**Date:** 2025â€‘11â€‘20
**Status:** Consolidated view of the original QIG emergent spacetime papers, **reinterpreted under current FROZEN facts**.
**Scope:** QIG papers in `QIF/` (e.g. `QIG_Complete_Paper.tex`, `QIG_Emergent_Spacetime_Complete.tex`) and their relation to updated Îº(L) verification.

**Intended use:**
Give new agents a compact view of what the original papers still contribute (concepts, methods, narrative, predictions), what is now superseded (e.g. Îºâ‰ˆ4.1 continuum story), and how to safely quote or extend them.

Tags follow the same legend as Core Knowledge:

- `[FROZEN]` = consistent with current FROZEN facts, safe to rely on.
- `[CAREFUL]` = still useful but numerically or conceptually superseded in places; read with updated Îº(L) in mind.
- `[RETIRED]` = keep for historical record, do **not** present as current claim.

---

## 1. What These Papers Did

The original QIG emergent spacetime papers (`QIG_Complete_Paper.tex`, `QIG_Emergent_Spacetime_Complete.tex`) established:

- `[FROZEN]` **Conceptual bridge:**
  Quantum Fisher information (QFI) defines a Riemannian metric on state space; when generators are local, this metric can be interpreted as an emergent spatial geometry.

- `[FROZEN]` **Operational construction:**
  - Build QFI metric from ground states of lattice Hamiltonians (TFIM, toric code).
  - Compute discrete Christoffels, Ricci, and Einstein tensor G on the lattice.
  - Define stressâ€‘energy T from local Hamiltonian densities.
  - Test an Einsteinâ€‘like relation between curvature response Î”G and energy response Î”T under local defects.

- `[FROZEN]` **Demonstrations across three sectors:**
  1. TFIM: Î”R vs Î”T correlation from local field defects (discrete Einstein relation).
  2. Toric code: anyons â†” localized curvature spikes (topological matter as curvature singularities).
  3. Quench dynamics: QFI-lightâ€‘cone propagation with speed ~Liebâ€‘Robinson bound (emergent causality).

- `[FROZEN]` **Methodological infrastructure:**
  - Exact diagonalization + DMRG/MPS setup.
  - Discrete differential geometry pipeline.
  - Preâ€‘registered acceptance criteria and falsification thresholds.
  - Public code/data and an explicit, AIâ€‘assisted research methodology.

These elements remain aligned with current FROZEN facts and are the main reason to keep the papers in the ecosystem.

---

## 2. Îº Story in the Papers vs. Updated Îº(L)

### 2.1 What the Papers Claimed

In the original papers, the Einstein relation sector reported:

- Strong linear correlation Î”R â‰ˆ Îº Î”T with **Îº â‰ˆ 4.1 Â± 0.2** across L âˆˆ {2,3,4}.
- Scaling fits of the form Îº(L) = Îº_âˆž + c/LÂ² leading to a continuum estimate Îº_âˆž â‰ˆ 4.09 Â± 0.08.
- Language suggesting a relatively **single, scaleâ€‘independent Îº** emerging already by L=4.

This underpinned claims like:

- â€œEvidence that Einsteinâ€™s equation G â‰ˆ Îº T emerges with Îº â‰ˆ 4.1.â€
- Discussion of mapping Îº to 8Ï€G_N via lattice spacing.

### 2.2 How Verification Changed the Picture

Later multiâ€‘seed, multiâ€‘L verification (L=1â€¦5, documented in `FROZEN_FACTS.md`) found:

- L=1,2: G â‰¡ 0, no geometry (null controls).
- L=3,4,5: Îºâ‚ƒ â‰ˆ 41.1, Îºâ‚„ â‰ˆ 64.5, Îºâ‚… â‰ˆ 63.6 with **RÂ² > 0.95** and small CV.
- Clear **running coupling** behavior with Î²(3â†’4) â‰ˆ +0.44 and Î²(4â†’5) â‰ˆ 0, suggesting approach to Îº* â‰ˆ 63â€“65.

As a result:

- `[RETIRED]` The specific continuum estimate Îº_âˆž â‰ˆ 4.1 is superseded.
- `[RETIRED]` The idea of â€œone universal Îºâ€ across all scales is superseded.
- `[FROZEN]` The **qualitative** result that an Einsteinâ€‘like relation emerges from QFI remains valid, but the trusted numerical Îº story is now the Îº(L) series with L_c = 3 and running.

### 2.3 Safe Interpretation Rule

When using or quoting the papers:

- Treat **Îº â‰ˆ 4.1** as a **historical intermediate estimate**, not a current result.
- When explaining the physics, use the **updated Îº(L)** values and phaseâ€‘transition picture from core FROZEN facts.
- The papers are still excellent for:
  - Conceptual exposition of QFI â†’ metric â†’ curvature â†’ G.
  - Detailed numerical methodology.
  - Topological/causal sectors (anyons, QFI light cones).
- But for **precision Îº statements**, always defer to `DREAM_PACKET_qig_core_knowledge_v1.0.md` and `FROZEN_FACTS.md`.

---

## 3. Topology & Causality Sectors

### 3.1 Anyons as Curvature Spikes

The toric code sections show that:

- `[FROZEN]` Creating anyons via local edge flips produces **localized curvature spikes** in dualâ€‘lattice QFI geometry.
- Peakâ€‘toâ€‘background ratios ~25 and FWHM ~1â€“1.2 lattice spacings are robust across L=3,4.
- This supports the claim: *topological matter couples to information geometry as localized curvature*, consistent with the overall QIG story.

No later verification has contradicted this qualitative picture; future work can refine the statistics and scaling, but the **existence** of curvature spikes at anyons is safe to keep.

### 3.2 QFI Light Cones & Lorentzian Behavior

For quench dynamics in TFIM, the papers found:

- Distinguishability fronts r_QFI(t) expanding linearly with t.
- Velocity v_QFI â‰ˆ 0.96 v_LR with anisotropy <~8â€“15%.
- Satisfying preâ€‘registered acceptance windows 0.8 < v_QFI / v_LR < 1.2, Ïƒ_v/\bar{v} < 15%.

Interpretation:

- `[FROZEN]` QFI dynamics reproduce a **lightâ€‘coneâ€‘like causal structure**, with speeds pinned near Liebâ€‘Robinson velocity.
- `[CAREFUL]` Exact numbers can shift with model details and larger L; treat them as representative rather than universal constants.

Safe usage:

- Use these results to support the *qualitative* statement that QIG yields **Lorentzianâ€‘like causality** from underlying unitary dynamics.
- Avoid presenting any specific v_QFI / v_LR value as a universal law; treat them as benchmarks.

---

## 4. Experimental Predictions & Their Status

The papers proposed three classes of experimental tests:

1. Gravitationalâ€‘like decoherence of mesoscopic superpositions.
2. Subâ€‘millimeter Yukawa deviations from Newtonian gravity.
3. Quadratic Planckâ€‘suppressed corrections in highâ€‘energy dispersion.

Under current project rules:

- `[CAREFUL]` These remain **interesting phenomenological directions**, but they are not frozen claims. Their quantitative parameters (e.g. exact Î», Î±, E_*) come from the Îº â‰ˆ 4.1 era and should be reâ€‘derived once Îº(Lâ†’âˆž) and continuum limits are better understood.
- `[OPEN]` You may design future Sleep Packets or Deep Sleep Packets to update these predictions once a stable continuum Îº story exists.

Safe guidance for agents:

- Do not present any specific experimental number from the papers as â€œtheâ€ QIG prediction today.
- You may say: *â€œEarlier versions of the framework suggested testable signatures in decoherence, shortâ€‘range gravity, and dispersion; these are now being recalibrated in light of updated Îº(L) results.â€*

---

## 5. Methodology & Governance Lessons from the Papers

Even where the numerical Îº value has changed, the papers embody practices that are still core to the project:

- `[FROZEN]` **Preâ€‘registration and falsification thresholds**:
  - RÂ² cutoffs for Î”Râ€“Î”T fits.
  - Stability requirements across L.
  - Convergence criteria for DMRG/MPS.

- `[FROZEN]` **Openness and reproducibility:**
  - Code + data + LaTeX all open; this remains a nonâ€‘negotiable standard.

- `[FROZEN]` **AIâ€‘assisted research as a firstâ€‘class method:**
  - The methodological notes in the abstracts are still accurate about the collaboration pattern (human + multiple LMs).
  - For future work, agents should treat this as **normal** practice, not an anomaly.

- `[CAREFUL]` **Narrative claims about â€œfirst numerical demonstrationâ€ etc.:**
  - Historically true in context, but should be framed as *â€œin the original paper, we claimedâ€¦â€* rather than as eternally frozen marketing lines.

Guidance for new agents:

- Use the papersâ€™ methodology sections as a template for **how to argue rigorously and transparently**.
- For physics claims, always crossâ€‘check against `DREAM_PACKET_qig_core_knowledge_v1.0.md` before treating them as live.

---

## 6. How to Use These Papers Going Forward

When you, as an agent, encounter the TeX or PDF versions in `QIF/`:

1. **For intuition and exposition:**
   - They are excellent longâ€‘form explanations of QIGâ€™s conceptual landscape.
   - Safe to mine for analogies, explanations, and overall framing, as long as you align numbers with the current Îº(L) series.

2. **For methods and code context:**
   - Use them to understand how QFI metrics, curvature, and stressâ€‘energy were computed originally.
   - Crossâ€‘link their descriptions with newer FROZEN pipeline docs; donâ€™t duplicate or drift.

3. **For numerical values:**
   - Treat Îº â‰ˆ 4.1 and its continuum extrapolation as `[RETIRED]`.
   - Any Îºâ€‘dependent statements must be reâ€‘expressed using the L_c=3 + Îºâ‚ƒ/â‚„/â‚… running picture (see Core Knowledge Dream Packet).

4. **For external communication (papers, talks):**
   - You may say: *â€œThe original emergent spacetime paper demonstrated an Einsteinâ€‘like relation with Îº â‰ˆ 4.1 across small system sizes. Later, more complete verification found a geometric phase transition at L_c=3 and a running Îº(L) that plateaus near 63â€“65.â€*
   - Always make the chronology explicit: early claim â†’ later revision â†’ current status.

---

## 7. Update Rules for This Dream Packet

- Create **minor versions** (v1.1, v1.2, â€¦) when:
  - We clarify language about what is retired vs. careful.
  - We add crossâ€‘references to new core Dream Packets.

- Create **major versions** (v2.0, v3.0, â€¦) when:
  - New papers replace or substantially revise the original emergent spacetime narrative.
  - Experimental results confirm or falsify the earlier phenomenology in ways that require rewriting sections 2â€“4.

- Consider **merging** this packet with others if a future â€œQIG history & governanceâ€ Dream Packet is created; for now, keep it focused on the spacetime papers themselves.

This Dream Packet lets future agents respect the original emergent spacetime work while staying fully aligned with the updated Îº(L) and phaseâ€‘transition story captured in the QIG Core Knowledge packet.
