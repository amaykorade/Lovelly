/**
 * Utility functions for widgets
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 0.1) {
    return `${Math.round(km * 1000)}m away`;
  } else if (km < 1) {
    return `${(km * 1000).toFixed(0)}m away`;
  } else if (km < 10) {
    return `${km.toFixed(1)} km away`;
  } else {
    return `${km.toFixed(0)} km away`;
  }
}

/**
 * Get distance direction (getting closer or farther)
 */
export function getDistanceDirection(
  currentDistance: number,
  previousDistance: number | null
): 'closer' | 'farther' | 'same' | null {
  if (previousDistance === null) return null;
  const diff = previousDistance - currentDistance;
  if (Math.abs(diff) < 0.01) return 'same';
  return diff > 0 ? 'closer' : 'farther';
}

/**
 * Calculate days until a date
 */
export function calculateDaysUntil(targetDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // For recurring dates (birthdays, anniversaries), calculate next occurrence
  const thisYear = new Date(today.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const nextYear = new Date(today.getFullYear() + 1, targetDate.getMonth(), targetDate.getDate());
  
  const target = thisYear >= today ? thisYear : nextYear;
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate years together from anniversary date
 */
export function calculateYearsTogether(anniversaryDate: Date): number {
  const today = new Date();
  let years = today.getFullYear() - anniversaryDate.getFullYear();
  const monthDiff = today.getMonth() - anniversaryDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < anniversaryDate.getDate())) {
    years--;
  }
  
  return Math.max(0, years);
}

/**
 * Format countdown text
 */
export function formatCountdown(days: number, type: 'anniversary' | 'birthday'): string {
  if (days === 0) {
    return type === 'anniversary' ? 'Today is your anniversary! 💕' : 'Today is their birthday! 🎂';
  } else if (days === 1) {
    return type === 'anniversary' ? 'Tomorrow is your anniversary! 💕' : 'Tomorrow is their birthday! 🎂';
  } else if (days < 7) {
    return `${days} days until ${type === 'anniversary' ? 'anniversary' : 'birthday'}`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} until ${type === 'anniversary' ? 'anniversary' : 'birthday'}`;
  } else {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} until ${type === 'anniversary' ? 'anniversary' : 'birthday'}`;
  }
}

/**
 * Parse date from Firestore timestamp or string
 */
export function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  try {
    if (dateValue.toDate) {
      return dateValue.toDate();
    } else if (dateValue instanceof Date) {
      return dateValue;
    } else if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }
    return null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

