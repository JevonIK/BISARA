/** The five alphabet missions and their selected reference clips share this source. */
export const alphabetMissionGroups = [
  { id: 'alfabet-a-e', number: '01', range: 'A–E', letters: ['A', 'B', 'C', 'D', 'E'] },
  { id: 'alfabet-f-j', number: '02', range: 'F–J', letters: ['F', 'G', 'H', 'I', 'J'] },
  { id: 'alfabet-k-o', number: '03', range: 'K–O', letters: ['K', 'L', 'M', 'N', 'O'] },
  { id: 'alfabet-p-t', number: '04', range: 'P–T', letters: ['P', 'Q', 'R', 'S', 'T'] },
  { id: 'alfabet-u-z', number: '05', range: 'U–Z', letters: ['U', 'V', 'W', 'X', 'Y', 'Z'] },
] as const;

export type AlphabetLetter = (typeof alphabetMissionGroups)[number]['letters'][number];

/** Original filenames from the supplied Mendeley Data archive; see docs/alphabet-dataset.md. */
const sourceVideos: Record<AlphabetLetter, string> = {
  A: 'A_040.MOV', B: 'B_037.MOV', C: 'C_008.MOV', D: 'D_009.MOV', E: 'E_012.MOV',
  F: 'F_007.MOV', G: 'G_011.MOV', H: 'H_001.MOV', I: 'I_006.MOV', J: 'J_017.MP4',
  K: 'K_007.MP4', L: 'L_008.MP4', M: 'M_008.MP4', N: 'N_012.MP4', O: 'O_001.MP4',
  P: 'P_008.MP4', Q: 'Q_008.MP4', R: 'R_004.MP4', S: 'S_012.MP4', T: 'T_012.MP4',
  U: 'U_004.MP4', V: 'V_004.MP4', W: 'W_001.MP4', X: 'X_001.MP4', Y: 'Y_012.MP4', Z: 'Z_012.MP4',
};

export type AlphabetVideo = {
  letter: AlphabetLetter;
  missionId: string;
  videoSrc: string;
  sourceFile: string;
};

export const alphabetVideos: readonly AlphabetVideo[] = alphabetMissionGroups.flatMap(
  (group) => group.letters.map((letter) => ({
    letter,
    missionId: group.id,
    videoSrc: `/media/bisindo-alphabet/${letter.toLowerCase()}.mp4`,
    sourceFile: sourceVideos[letter],
  })),
);

export function getAlphabetVideosForMission(missionId: string) {
  return alphabetVideos.filter((video) => video.missionId === missionId);
}
