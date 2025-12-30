import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Convert drawing strokes to an image
 * This creates a snapshot of the drawing that can be displayed on lock screen
 */
export interface Stroke {
  id: string;
  color: string;
  points: { x: number; y: number }[];
  width: number;
}

/**
 * Generate SVG path from stroke points
 */
const createSmoothPath = (points: { x: number; y: number }[]): string => {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    
    if (i === 0) {
      path += ` L ${current.x} ${current.y}`;
    }
    
    const controlX = (current.x + next.x) / 2;
    const controlY = (current.y + next.y) / 2;
    
    if (i < points.length - 2) {
      path += ` Q ${current.x} ${current.y} ${controlX} ${controlY}`;
    } else {
      path += ` Q ${current.x} ${current.y} ${next.x} ${next.y}`;
    }
  }
  
  return path;
};

/**
 * Render drawing strokes to an image
 * @param strokes - Array of stroke data
 * @param width - Canvas width (default: 400)
 * @param height - Canvas height (default: 400)
 * @returns Promise<string> - Base64 image data URI
 */
export const renderDrawingToImage = async (
  strokes: Stroke[],
  width: number = 400,
  height: number = 400
): Promise<string> => {
  try {
    if (!strokes || strokes.length === 0) {
      return '';
    }

    // Generate SVG string directly
    const svgString = generateSVGString(strokes, width, height);
    
    // Return SVG data URI (works for notifications and display)
    // For native lock screen widgets, this would need to be converted to PNG/JPEG
    // using react-native-view-shot or similar, but SVG works for notifications
    const encoded = encodeURIComponent(svgString);
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
  } catch (error) {
    console.error('Error rendering drawing to image:', error);
    return '';
  }
};

/**
 * Generate SVG string from strokes
 */
function generateSVGString(strokes: Stroke[], width: number, height: number): string {
  const paths = strokes
    .map((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return '';
      const pathData = createSmoothPath(stroke.points);
      return `<path d="${pathData}" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    })
    .join('');

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#FFFFFF"/>
    ${paths}
  </svg>`;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});

