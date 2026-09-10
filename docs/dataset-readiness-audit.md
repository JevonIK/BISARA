# WL-BISINDO dataset readiness audit

Audit date: 10 September 2026

## Decision

The 32 local videos are usable as demonstration references in a
non-commercial prototype. They are not sufficient to validate a checker,
calibrate a pass threshold, train a classifier, certify language ability, or
support a commercial release.

This decision separates the complete WL-BISINDO research dataset from the
small subset shipped by BISARA. The source dataset contains 1,600 isolated-sign
videos across 32 glosses. BISARA currently ships 32 videos: one sample for each
gloss.

## Local subset results

The audit opened every local file in the same Chromium video pipeline and
processed each clip with the same MediaPipe Hand Landmarker used by the app.

| Check                                 | Result                                  |
| ------------------------------------- | --------------------------------------- |
| Files expected / found / decoded      | 32 / 32 / 32                            |
| Label coverage                        | Labels 0–31 exactly once                |
| Duplicate SHA-256 hashes              | 0                                       |
| Total size                            | 44.45 MiB                               |
| Duration                              | 1.798–3.233 s; mean 2.413 s             |
| Resolution                            | 13 at 1280×720; 19 at 1920×1080         |
| Local signer distribution             | signer 0: 12; signer 1: 14; signer 2: 6 |
| Hand detection during the active span | 81–100%; mean 97.5%                     |
| Longest internal detection gap        | 2 sampled frames                        |
| Reference extraction failures         | 0                                       |

Raw detection across the entire videos is 49–86% because the clips contain
setup and resting frames before and after the sign. After those empty
boundaries are excluded, tracking is stable. The lowest active-span result is
`Di mana` at 81% with a two-frame gap; it still exceeds the checker's usable
reference requirement.

The reference detector consistently identifies four two-hand examples:
`Motor`, `Bagaimana`, `Teman`, and `Rumah`. Visual review also found that the
former curriculum copy for `Belajar`, `Keluarga`, and `Malam` incorrectly told
learners to coordinate two hands. Those instructions were changed to match the
one-hand videos and observable checker features.

## Representation risks

Each label has only one local signer/example. A score can therefore measure
similarity to that exemplar, but cannot establish that the checker generalizes
to different bodies, dominant hands, signing styles, cameras, lighting, or
Banten sign variants.

The local selection also confounds signer and label: labels 0–11 use signer 0,
labels 12–25 use signer 1, and labels 26–31 use signer 2. This does not corrupt
the current per-sign reference comparison, but the subset must never be used
to train or evaluate a word classifier because identity, clothing, resolution,
and recording style could leak the label group.

The source repository describes 32 glosses, 50 instances per gloss, and five
signer IDs. Its published split manifest is internally imbalanced:

- signer 0 has 10 examples for labels 0–11 and none for labels 12–31;
- signers 1 and 2 have 10 examples for labels 0–11 and 15 for labels 12–31;
- signers 3 and 4 have 10 examples for all labels.

Thus labels 12–31 contain four signers rather than five even though the source
README says each sign is performed by five signers. The README also refers to
four `SI_1`–`SI_4` manifests, while the current repository exposes one
`SI_split_metadata.json` that holds out signer 4. These discrepancies require
clarification from the dataset authors before relying on published
signer-independent claims.

## Language and rights review

The filenames and numeric labels match the source gloss table, but this audit
cannot establish that each performance is linguistically correct or suitable
for teaching. A fluent Banten BISINDO reviewer from the Deaf community needs
to validate handshape, movement, location, orientation, non-manual signals,
gloss meaning, and learning copy.

The dataset is published under
[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). BISARA's
attribution identifies the work, authors, source, paper, license, and local
selection. Commercial use needs separate permission. The public material
reviewed for this audit does not clearly document the scope of participant
consent or releases for likeness, educational redistribution, and product use.
That scope should be confirmed in writing with the authors before public
deployment.

## Requirements before a release claim

1. Obtain written clarification for participant consent, permitted product
   use, and the manifest/signer discrepancies.
2. Have Banten BISINDO experts from the Deaf community approve every clip,
   gloss, instruction, and scenario.
3. Calibrate the checker on labeled attempts from people absent from the
   reference set. Include correct and intentionally incorrect executions.
4. Report false rejection and false acceptance per sign and per held-out
   signer; choose thresholds from those results instead of hand tuning.
5. Keep the present 32 clips as demonstrations. Use multiple approved
   exemplars per sign or a validated signer-independent model for assessment.
6. If BISARA will be commercial, replace the media or obtain a separate license
   before release.

## Sources

- [WL-BISINDO dataset repository](https://github.com/AceKinnn/WL-BISINDO)
- [WL-BISINDO paper](https://doi.org/10.1016/j.procs.2025.08.277)
- [WL-BISINDO dataset page](https://www.kaggle.com/datasets/glennleonali/wl-bisindo)
- [CC BY-NC 4.0 license](https://creativecommons.org/licenses/by-nc/4.0/)
