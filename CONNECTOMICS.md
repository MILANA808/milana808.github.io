# AKSI Connectomics Lab — scientific stance

## What world-class labs do (2024–2026)

| Resource | Scale | Role |
|----------|-------|------|
| FlyWire FAFB (Dorkenwald et al., Nature 2024) | ~139,255 neurons, ~15M edges | Whole adult female brain connectome |
| Schlegel et al., Nature 2024 | ~8,453 cell types | Hierarchical annotations |
| Shiu et al., Nature 2024 | whole-brain LIF | Dynamics on connectome |
| Codex (codex.flywire.ai) | explore + downloads | Official explorer |
| MANC / MaleCNS / BANC | VNC / CNS | Body-nerve continuity |
| webgpu-fly, fruit-fly-lab | browser LIF | Full-graph demos (tens–hundreds MB) |
| flybody / NeuroMechFly | MuJoCo body | Embodiment |

## Data reality

- Neuron meta: ~10 MB
- Simple edgelist: ~289 MB
- Synapses: multi-GB
- Browser full LIF: WebGPU/Worker + large binary assets

**AKSI does not ship the 289 MB edgelist inside this static site.** Claiming all 140k synaptic weights live in the SPA would be false.

## What AKSI provides

1. **Connectomics Lab** (`/aksi-neuro-lab.html`) — census, SOTA map, protocol, links to full-scale demos
2. **Fly-Brain** (`aksi-fly-brain.js`) — compact LIF behavioral substrate used as decision gate
3. **Decision Receipt** — seal lab experiments offline
4. Path: when weights are hosted, same seal/verify wraps a full Worker simulation

## Citations

- Dorkenwald et al. Nature 2024
- Schlegel et al. Nature 2024
- Shiu et al. Nature 2024
- Takemura et al. MANC
- Berg et al. MaleCNS / Cell 2026

Contact: aksilove@internet.ru
