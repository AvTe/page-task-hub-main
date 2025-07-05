
import { AppState, Page, Task } from '../types';

const STORAGE_KEY_PREFIX = 'taskerlister-data';

export const loadFromStorage = (userId?: string): AppState => {
  try {
    if (typeof window === 'undefined') {
      return { pages: [], unassignedTasks: [] };
    }

    const storageKey = userId ? `${STORAGE_KEY_PREFIX}-${userId}` : STORAGE_KEY_PREFIX;

    const data = localStorage.getItem(storageKey);
    if (data) {
      const parsedData = JSON.parse(data);

      // Validate the data structure
      if (parsedData && typeof parsedData === 'object' &&
          Array.isArray(parsedData.pages) && Array.isArray(parsedData.unassignedTasks)) {
        return parsedData;
      } else {
        return { pages: [], unassignedTasks: [] };
      }
    }
  } catch (error) {
    // Silent error handling
  }

  return {
    pages: [],
    unassignedTasks: []
  };
};

export const saveToStorage = (state: AppState, userId?: string): void => {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    const storageKey = userId ? `${STORAGE_KEY_PREFIX}-${userId}` : STORAGE_KEY_PREFIX;

    // Validate state before saving
    if (state && typeof state === 'object' &&
        Array.isArray(state.pages) && Array.isArray(state.unassignedTasks)) {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  } catch (error) {
    // Silent error handling
  }
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Utility function to clear storage for a specific user
export const clearUserStorage = (userId: string): void => {
  try {
    if (typeof window === 'undefined') return;

    const storageKey = `${STORAGE_KEY_PREFIX}-${userId}`;
    localStorage.removeItem(storageKey);
  } catch (error) {
    // Silent error handling
  }
};
