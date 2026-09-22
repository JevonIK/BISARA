import assert from 'node:assert/strict';
import { test } from 'node:test';

import { alphabetVideos, isAlphabetDictionaryUnlocked } from '../lib/alphabet-data.ts';

void test('Kamus shows 26 letters and unlocks only the completed mission group', () => {
  assert.deepEqual(alphabetVideos.map(({ letter }) => letter).join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const progress = { completedMissionIds: [] as string[] };

  for (const video of alphabetVideos) {
    assert.equal(isAlphabetDictionaryUnlocked(video, progress), false);
  }

  progress.completedMissionIds = ['alfabet-a-e'];
  for (const video of alphabetVideos) {
    assert.equal(
      isAlphabetDictionaryUnlocked(video, progress),
      video.missionId === 'alfabet-a-e',
      `Huruf ${video.letter} follows its mission progress`,
    );
  }
});
