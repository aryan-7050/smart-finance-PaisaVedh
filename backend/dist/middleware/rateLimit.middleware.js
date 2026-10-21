"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.limiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = __importDefault(require("../utils/logger"));
// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';
// Create a dummy middleware that just passes through
const dummyLimiter = (req, res, next) => {
    next();
};
// Export limiters - conditionally assign based on environment
exports.limiter = isDevelopment
    ? dummyLimiter
    : (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: {
            success: false,
            message: 'Too many requests from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger_1.default.warn(`Rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json({
                success: false,
                message: 'Too many requests, please slow down.',
            });
        },
    });
exports.authLimiter = isDevelopment
    ? dummyLimiter
    : (0, express_rate_limit_1.default)({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20,
        message: {
            success: false,
            message: 'Too many authentication attempts, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger_1.default.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json({
                success: false,
                message: 'Too many authentication attempts, please try again later.',
            });
        },
    });
// Log the status
if (isDevelopment) {
    console.log('⚠️  Rate limiting is DISABLED in development mode');
}
else {
    console.log('🔒 Rate limiting ENABLED (production mode)');
}
//# sourceMappingURL=rateLimit.middleware.js.map