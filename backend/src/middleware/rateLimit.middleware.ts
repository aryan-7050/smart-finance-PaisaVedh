import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Create a dummy middleware that just passes through
const dummyLimiter = (req: any, res: any, next: any) => {
  next();
};

// Export limiters - conditionally assign based on environment
export const limiter = isDevelopment 
  ? dummyLimiter 
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          message: 'Too many requests, please slow down.',
        });
      },
    });

export const authLimiter = isDevelopment
  ? dummyLimiter
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20,
      message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          success: false,
          message: 'Too many authentication attempts, please try again later.',
        });
      },
    });

// Log the status
if (isDevelopment) {
  console.log('⚠️  Rate limiting is DISABLED in development mode');
} else {
  console.log('🔒 Rate limiting ENABLED (production mode)');
}