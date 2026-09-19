import type { HandObservation } from './gesture-scoring';

export type OverlayPoint = { x: number; y: number };

/** Maps normalized MediaPipe coordinates onto the same crop used by CSS object-cover. */
export function createObjectCoverProjection(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  const offsetX = (targetWidth - renderedWidth) / 2;
  const offsetY = (targetHeight - renderedHeight) / 2;

  return (point: OverlayPoint): OverlayPoint => ({
    x: offsetX + point.x * renderedWidth,
    y: offsetY + point.y * renderedHeight,
  });
}

/** Draws landmarks only; scoring continues to use the untouched normalized coordinates. */
export function drawHandLandmarkOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  hands: HandObservation[],
  connections: Array<[number, number]>,
) {
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
  if (!displayWidth || !displayHeight || !video.videoWidth || !video.videoHeight) return;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(displayWidth * pixelRatio);
  const pixelHeight = Math.round(displayHeight * pixelRatio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  const project = createObjectCoverProjection(
    video.videoWidth,
    video.videoHeight,
    displayWidth,
    displayHeight,
  );

  for (const { landmarks } of hands) {
    context.strokeStyle = '#55c7b5';
    context.lineWidth = Math.max(2, displayWidth / 480);

    for (const [startIndex, endIndex] of connections) {
      const start = landmarks[startIndex];
      const end = landmarks[endIndex];
      if (!start || !end) continue;
      const projectedStart = project(start);
      const projectedEnd = project(end);

      context.beginPath();
      context.moveTo(projectedStart.x, projectedStart.y);
      context.lineTo(projectedEnd.x, projectedEnd.y);
      context.stroke();
    }

    for (const [index, landmark] of landmarks.entries()) {
      const projected = project(landmark);
      context.beginPath();
      context.fillStyle = index === 0 ? '#f4c95d' : '#ff6f61';
      context.arc(projected.x, projected.y, index === 0 ? 5 : 3.5, 0, Math.PI * 2);
      context.fill();
    }
  }
}
