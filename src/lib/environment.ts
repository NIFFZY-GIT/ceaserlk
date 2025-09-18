/**
 * Environment configuration with security validation
 * Run this during application startup to ensure all security requirements are met
 */

import { secureLog } from './security';
import crypto from 'crypto';

interface EnvironmentConfig {
  // Database
  DATABASE_URL: string;
  
  // JWT Security
  JWT_SECRET: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
  
  // Email Configuration
  EMAIL_HOST: string;
  EMAIL_PORT: string;
  EMAIL_SECURE: string;
  EMAIL_USER: string;
  EMAIL_PASSWORD: string;
  EMAIL_FROM_NAME?: string;
  
  // Payment Processing
  STRIPE_SECRET_KEY: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  
  // Cron Security
  CRON_SECRET: string;
  
  // Application
  NEXT_PUBLIC_APP_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
}

/**
 * Validates and returns environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    DATABASE_URL: process.env.DATABASE_URL || '',
    JWT_SECRET: process.env.JWT_SECRET || '',
    JWT_ISSUER: process.env.JWT_ISSUER,
    JWT_AUDIENCE: process.env.JWT_AUDIENCE,
    EMAIL_HOST: process.env.EMAIL_HOST || '',
    EMAIL_PORT: process.env.EMAIL_PORT || '587',
    EMAIL_SECURE: process.env.EMAIL_SECURE || 'false',
    EMAIL_USER: process.env.EMAIL_USER || '',
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    CRON_SECRET: process.env.CRON_SECRET || '',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  };

  validateEnvironmentConfig(config);
  return config;
}

/**
 * Comprehensive environment validation with security checks
 */
function validateEnvironmentConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];

  // Required fields validation
  const requiredFields: (keyof EnvironmentConfig)[] = [
    'DATABASE_URL',
    'JWT_SECRET',
    'EMAIL_HOST',
    'EMAIL_USER', 
    'EMAIL_PASSWORD',
    'STRIPE_SECRET_KEY',
    'CRON_SECRET'
  ];

  requiredFields.forEach(field => {
    if (!config[field]) {
      errors.push(`Missing required environment variable: ${field}`);
    }
  });

  // JWT Secret validation
  if (config.JWT_SECRET) {
    if (config.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }
    
    // Check if it's a strong random string
    const entropy = calculateEntropy(config.JWT_SECRET);
    if (entropy < 4.0) {
      errors.push('JWT_SECRET appears to be weak - use a cryptographically strong random string');
    }
  }

  // CRON Secret validation
  if (config.CRON_SECRET) {
    if (config.CRON_SECRET.includes('generate_a_very_strong')) {
      errors.push('CRON_SECRET is using placeholder value - replace with strong random string');
    }
    
    if (config.CRON_SECRET.length < 32) {
      errors.push('CRON_SECRET should be at least 32 characters long');
    }
  }

  // Database URL validation
  if (config.DATABASE_URL && !config.DATABASE_URL.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  // Email configuration validation
  if (config.EMAIL_PORT) {
    const port = parseInt(config.EMAIL_PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('EMAIL_PORT must be a valid port number');
    }
  }

  // Stripe keys validation
  if (config.STRIPE_SECRET_KEY && !config.STRIPE_SECRET_KEY.startsWith('sk_')) {
    errors.push('STRIPE_SECRET_KEY must be a valid Stripe secret key');
  }

  if (config.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !config.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_')) {
    errors.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a valid Stripe publishable key');
  }

  // Production-specific validations
  if (config.NODE_ENV === 'production') {
    // Ensure HTTPS in production
    if (config.NEXT_PUBLIC_APP_URL && !config.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
      errors.push('NEXT_PUBLIC_APP_URL must use HTTPS in production');
    }
    
    // Ensure production Stripe keys
    if (config.STRIPE_SECRET_KEY.includes('test')) {
      console.warn('⚠️  WARNING: Using test Stripe keys in production');
    }
    
    // Email security validation
    if (config.EMAIL_SECURE === 'false' && config.EMAIL_PORT === '587') {
      console.warn('⚠️  WARNING: Consider using secure email connection in production');
    }
  }

  // Log warnings for development environment
  if (config.NODE_ENV === 'development') {
    secureLog('info', 'Development environment detected', {
      emailHost: config.EMAIL_HOST,
      stripeMode: config.STRIPE_SECRET_KEY.includes('test') ? 'test' : 'live'
    });
  }

  // Throw error if validation fails
  if (errors.length > 0) {
    const errorMessage = `Environment validation failed:\n${errors.join('\n')}`;
    secureLog('error', 'Environment validation failed', { errors });
    throw new Error(errorMessage);
  }

  secureLog('info', 'Environment validation passed', {
    nodeEnv: config.NODE_ENV,
    emailHost: config.EMAIL_HOST,
    hasJwtSecret: !!config.JWT_SECRET,
    hasCronSecret: !!config.CRON_SECRET
  });
}

/**
 * Calculate entropy of a string to assess randomness
 */
function calculateEntropy(str: string): number {
  const frequencies: Record<string, number> = {};
  
  // Count character frequencies
  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  
  // Calculate entropy
  let entropy = 0;
  const length = str.length;
  
  for (const count of Object.values(frequencies)) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

/**
 * Generate secure random string for secrets
 */
export function generateSecureSecret(length: number = 64): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Initialize environment validation on startup
 */
export function initializeEnvironment(): EnvironmentConfig {
  try {
    const config = getEnvironmentConfig();
    
    // Log successful initialization
    secureLog('info', 'Environment initialized successfully', {
      nodeEnv: config.NODE_ENV,
      appUrl: config.NEXT_PUBLIC_APP_URL
    });
    
    return config;
  } catch (error) {
    secureLog('error', 'Failed to initialize environment', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}

// Environment configuration singleton
let environmentConfig: EnvironmentConfig | null = null;

/**
 * Get validated environment configuration (cached)
 */
export function getValidatedEnvironment(): EnvironmentConfig {
  if (!environmentConfig) {
    environmentConfig = initializeEnvironment();
  }
  return environmentConfig;
}