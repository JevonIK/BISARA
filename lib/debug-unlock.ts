/** Opt-in local debugging must never silently bypass curriculum prerequisites. */
export function isCurriculumDebugUnlocked() {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_BISARA_CURRICULUM_DEBUG === 'true'
  );
}
