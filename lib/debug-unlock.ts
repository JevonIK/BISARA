/** Local development can inspect any mission without changing saved progress. */
export function isCurriculumDebugUnlocked() {
  return process.env.NODE_ENV === 'development';
}
