// Timezone utilities for EasTask application

export interface TimezoneInfo {
  timezone: string;
  offset: string;
  abbreviation: string;
  location: string;
}

/**
 * Get the user's current timezone information
 */
export const getUserTimezone = (): TimezoneInfo => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  
  // Get timezone offset
  const offsetMinutes = now.getTimezoneOffset();
  const offsetHours = Math.abs(offsetMinutes) / 60;
  const offsetSign = offsetMinutes <= 0 ? '+' : '-';
  const offset = `GMT${offsetSign}${offsetHours.toString().padStart(2, '0')}:${(Math.abs(offsetMinutes) % 60).toString().padStart(2, '0')}`;
  
  // Get timezone abbreviation
  const abbreviation = new Intl.DateTimeFormat('en', {
    timeZoneName: 'short',
    timeZone: timezone
  }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || 'UTC';
  
  // Get location from timezone
  const location = timezone.replace(/_/g, ' ').split('/').pop() || timezone;
  
  return {
    timezone,
    offset,
    abbreviation,
    location
  };
};

/**
 * Format time with timezone information
 */
export const formatTimeWithTimezone = (date: Date = new Date(), includeTimezone: boolean = true): string => {
  const timeString = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  if (!includeTimezone) {
    return timeString;
  }
  
  const timezoneInfo = getUserTimezone();
  return `${timeString} ${timezoneInfo.abbreviation}`;
};

/**
 * Format date with timezone information
 */
export const formatDateWithTimezone = (date: Date = new Date(), includeTime: boolean = false): string => {
  const dateString = date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  if (!includeTime) {
    return dateString;
  }
  
  const timeString = formatTimeWithTimezone(date, true);
  return `${dateString}, ${timeString}`;
};

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 */
export const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (Math.abs(diffInSeconds) < 60) {
    return diffInSeconds >= 0 ? 'in a few seconds' : 'a few seconds ago';
  } else if (Math.abs(diffInMinutes) < 60) {
    const minutes = Math.abs(diffInMinutes);
    return diffInMinutes >= 0 
      ? `in ${minutes} minute${minutes !== 1 ? 's' : ''}`
      : `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (Math.abs(diffInHours) < 24) {
    const hours = Math.abs(diffInHours);
    return diffInHours >= 0 
      ? `in ${hours} hour${hours !== 1 ? 's' : ''}`
      : `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (Math.abs(diffInDays) < 7) {
    const days = Math.abs(diffInDays);
    return diffInDays >= 0 
      ? `in ${days} day${days !== 1 ? 's' : ''}`
      : `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};

/**
 * Convert UTC time to user's local time
 */
export const convertUTCToLocal = (utcDate: string | Date): Date => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
};

/**
 * Convert local time to UTC
 */
export const convertLocalToUTC = (localDate: Date): Date => {
  return new Date(localDate.getTime() + (localDate.getTimezoneOffset() * 60000));
};

/**
 * Check if a date is today in user's timezone
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Check if a date is tomorrow in user's timezone
 */
export const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
};

/**
 * Check if a date is yesterday in user's timezone
 */
export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

/**
 * Get business hours for the user's timezone
 */
export const getBusinessHours = (): { start: string; end: string } => {
  // Default business hours: 9 AM to 6 PM
  return {
    start: '09:00',
    end: '18:00'
  };
};

/**
 * Check if current time is within business hours
 */
export const isBusinessHours = (): boolean => {
  const now = new Date();
  const currentHour = now.getHours();
  const businessHours = getBusinessHours();
  
  const startHour = parseInt(businessHours.start.split(':')[0]);
  const endHour = parseInt(businessHours.end.split(':')[0]);
  
  return currentHour >= startHour && currentHour < endHour;
};

/**
 * Get timezone-aware greeting based on current time
 */
export const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 17) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
};

/**
 * Format duration in a human-readable way
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
};

/**
 * Get next business day
 */
export const getNextBusinessDay = (date: Date = new Date()): Date => {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Skip weekends
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
};

/**
 * Get current time formatted for display
 */
export const getCurrentTimeDisplay = (): { time: string; location: string; timezone: string } => {
  const timezoneInfo = getUserTimezone();
  const currentTime = new Date();

  return {
    time: formatTimeWithTimezone(currentTime, true),
    location: timezoneInfo.location,
    timezone: timezoneInfo.timezone
  };
};
