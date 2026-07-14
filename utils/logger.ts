import { Platform } from 'react-native';
import { API_BASE_URL } from '@/constants/api';

export interface ErrorLogPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  platform: string;
  timestamp: string;
}

/**
 * Centrally log frontend errors to the backend console and log file.
 */
export async function logError(error: any, context?: string, componentStack?: string) {
  try {
    let message = 'Unknown error';
    let stack = '';

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack || '';
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      message = error.message || JSON.stringify(error);
      stack = error.stack || '';
    }

    if (context) {
      message = `[${context}] ${message}`;
    }

    const payload: ErrorLogPayload = {
      message,
      stack,
      componentStack,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      url: context || 'Unknown context',
    };

    // Print to developer console locally
    console.error(`[Local LogError] ${message}`, stack);

    // Send error report to the backend API
    const response = await fetch(`${API_BASE_URL}/api/logs/error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`Failed to send log to backend: Server responded with status ${response.status}`);
    }
  } catch (loggingError) {
    // If logging fails (e.g. backend offline), prevent infinite error loop
    console.error('Failed to log error to backend:', loggingError);
  }
}
