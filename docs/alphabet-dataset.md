# Alphabet video source and selection

Chapter 5 uses 26 selected clips from [Indonesian Sign Language Dataset:
Alphabet Video](https://data.mendeley.com/datasets/p7j5jrsbbb/1) by Indah
Siradjuddin, published 22 January 2024, DOI
[10.17632/p7j5jrsbbb.1](https://doi.org/10.17632/p7j5jrsbbb.1).
The published dataset license is [Creative Commons Attribution 4.0
International](https://creativecommons.org/licenses/by/4.0/) (CC BY 4.0).
The dataset was produced by the Informatics Department research group at
Universitas Trunojoyo Madura. Attribution does not imply endorsement of BISARA.

The supplied archive contains 26 per-letter ZIP files with 517 videos in all.
The available samples are: A 40, B 73, C 15, D 16, E 15, F 26, G 20, H 20,
I 20, J 22, K 25, and 15 each for L–Z. A–I are MOV files and J–Z are MP4;
all examined candidates had H.264 (`avc1`) video. The 26 choices below were
visually reviewed at the beginning, middle, and end for visible hands, stable
framing, and legible movement. This is a teaching subset, not a training set
or a validated regional/linguistic reference for automated assessment.
The prototype camera checker compares each attempt with precomputed hand
landmarks from the selected clip and two additional clips per letter. Many
source letters use two hands, so the checker uses each clip's detected hand
count rather than ASL alphabet rules. J requires a visible vertical sweep;
Z is assessed by hand form because its clips do not isolate a consistent full
path. All 26 selected clips passed a template self-check, and the 26×26
selected-example comparison rejected every different letter. A separate 26-clip
audit passed 25 clips; the remaining B clip could not be assessed because its
overlapping hands were detected as only one hand. These internal checks do not
establish sensitivity or specificity across signers, cameras, or BISINDO variants.

| Letter | Source file | Letter | Source file | Letter | Source file |
| :--- | :--- | :--- | :--- | :--- | :--- |
| A | A_040.MOV | J | J_017.MP4 | S | S_012.MP4 |
| B | B_037.MOV | K | K_007.MP4 | T | T_012.MP4 |
| C | C_008.MOV | L | L_008.MP4 | U | U_004.MP4 |
| D | D_009.MOV | M | M_008.MP4 | V | V_004.MP4 |
| E | E_012.MOV | N | N_012.MP4 | W | W_001.MP4 |
| F | F_007.MOV | O | O_001.MP4 | X | X_001.MP4 |
| G | G_011.MOV | P | P_008.MP4 | Y | Y_012.MP4 |
| H | H_001.MOV | Q | Q_008.MP4 | Z | Z_012.MP4 |
| I | I_006.MOV | R | R_004.MP4 | | |

Only these 26 clips were converted, using macOS `avconvert` with H.264
640×480 or 960×540 presets and then losslessly remuxed to MP4. Aspect ratio,
full-frame composition, and original timing were preserved; no gesture frames
were deliberately trimmed. The original 26 files totaled 128,743,408 bytes;
the MP4 subset totals 22,504,713 bytes (22.5 MB). No raw archive or other samples
are included in the repository. Source clips include visible people; the
Creative Commons license does not itself settle all personal-image rights.
