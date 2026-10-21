"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const error_middleware_1 = require("./middleware/error.middleware");
const rateLimit_middleware_1 = require("./middleware/rateLimit.middleware");
const auth_middleware_1 = require("./middleware/auth.middleware");
const auth_controller_1 = require("./controllers/auth.controller");
const transaction_controller_1 = require("./controllers/transaction.controller");
const budget_controller_1 = require("./controllers/budget.controller");
const analytics_controller_1 = require("./controllers/analytics.controller");
const savings_controller_1 = require("./controllers/savings.controller");
const report_controller_1 = require("./controllers/report.controller");
const logger_1 = __importDefault(require("./utils/logger"));
// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================
dotenv_1.default.config();
const app = (0, express_1.default)();
// ============================================
// RENDER CONFIGURATION
// ============================================
// Required when deploying Express behind Render's proxy
app.set('trust proxy', 1);
// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================
const upload = (0, multer_1.default)({
    dest: 'uploads/',
});
// ============================================
// DATABASE CONNECTION
// ============================================
(0, database_1.connectDB)();
redis_1.redisClient.connect().catch((error) => {
    logger_1.default.error('Redis connection failed:', error);
});
// ============================================
// CONTROLLERS
// ============================================
const authController = new auth_controller_1.AuthController();
const transactionController = new transaction_controller_1.TransactionController();
const budgetController = new budget_controller_1.BudgetController();
const analyticsController = new analytics_controller_1.AnalyticsController();
const savingsController = new savings_controller_1.SavingsController();
const reportController = new report_controller_1.ReportController();
// ============================================
// SECURITY
// ============================================
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: {
        policy: 'cross-origin',
    },
}));
// ============================================
// CORS CONFIGURATION
// ============================================
const developmentOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://localhost:5002',
    'http://localhost:5003',
];
const productionOrigins = [
    'https://smart-finance-paisavedh.onrender.com',
    'https://paisavedh-frontend.vercel.app',
    'https://paisavedh.vercel.app',
    'https://smart-finance-paisavedh.vercel.app',
];
// FRONTEND_URL can be configured directly in Render
const frontendUrl = process.env.FRONTEND_URL;
if (frontendUrl) {
    productionOrigins.push(frontendUrl);
}
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? productionOrigins
    : developmentOrigins;
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests without Origin header
        // Example: Postman, curl, server-to-server requests
        if (!origin) {
            return callback(null, true);
        }
        // Development mode
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        // Production mode
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        logger_1.default.warn(`Blocked by CORS: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'OPTIONS',
    ],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
    ],
}));
// ============================================
// PREFLIGHT REQUESTS
// ============================================
app.options('*', (0, cors_1.default)());
// ============================================
// BASIC MIDDLEWARE
// ============================================
app.use((0, compression_1.default)());
app.use(express_1.default.json({
    limit: '10mb',
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: '10mb',
}));
// ============================================
// RATE LIMITING
// ============================================
app.use('/api', rateLimit_middleware_1.limiter);
app.use('/api/auth', rateLimit_middleware_1.authLimiter);
// ============================================
// FAVICON
// ============================================
app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
});
// ============================================
// HEALTH / TEST ROUTES
// ============================================
app.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'PaisaVedh Backend Running',
        timestamp: new Date().toISOString(),
    });
});
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
    });
});
app.get('/api', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'PaisaVedh API Active',
        version: '1.0.0',
    });
});
// ============================================
// AUTH ROUTES
// ============================================
app.post('/api/auth/register', authController.register.bind(authController));
app.post('/api/auth/login', authController.login.bind(authController));
app.post('/api/auth/refresh', authController.refreshToken.bind(authController));
app.post('/api/auth/logout', auth_middleware_1.protect, authController.logout.bind(authController));
app.get('/api/auth/profile', auth_middleware_1.protect, authController.getProfile.bind(authController));
app.put('/api/auth/profile', auth_middleware_1.protect, authController.updateProfile.bind(authController));
app.put('/api/auth/change-password', auth_middleware_1.protect, authController.changePassword.bind(authController));
// ============================================
// TRANSACTION ROUTES
// ============================================
app.get('/api/transactions', auth_middleware_1.protect, transactionController.getTransactions.bind(transactionController));
app.post('/api/transactions', auth_middleware_1.protect, transactionController.createTransaction.bind(transactionController));
app.post('/api/transactions/upload-csv', auth_middleware_1.protect, upload.single('file'), transactionController.uploadCSV.bind(transactionController));
app.get('/api/transactions/stats', auth_middleware_1.protect, transactionController.getTransactionStats.bind(transactionController));
app.put('/api/transactions/:id', auth_middleware_1.protect, transactionController.updateTransaction.bind(transactionController));
app.delete('/api/transactions/:id', auth_middleware_1.protect, transactionController.deleteTransaction.bind(transactionController));
// ============================================
// BUDGET ROUTES
// ============================================
app.get('/api/budgets', auth_middleware_1.protect, budgetController.getBudgets.bind(budgetController));
app.post('/api/budgets', auth_middleware_1.protect, budgetController.createBudget.bind(budgetController));
app.put('/api/budgets/:id', auth_middleware_1.protect, budgetController.updateBudget.bind(budgetController));
app.delete('/api/budgets/:id', auth_middleware_1.protect, budgetController.deleteBudget.bind(budgetController));
app.get('/api/budgets/alerts', auth_middleware_1.protect, budgetController.getBudgetAlerts.bind(budgetController));
// ============================================
// ANALYTICS ROUTES
// ============================================
app.get('/api/analytics/dashboard', auth_middleware_1.protect, analyticsController.getDashboardData.bind(analyticsController));
app.get('/api/analytics/insights', auth_middleware_1.protect, analyticsController.getSpendingInsights.bind(analyticsController));
app.get('/api/analytics/cashflow', auth_middleware_1.protect, analyticsController.getCashFlow.bind(analyticsController));
// ============================================
// SAVINGS ROUTES
// ============================================
app.get('/api/savings/goals', auth_middleware_1.protect, savingsController.getGoals.bind(savingsController));
app.post('/api/savings/goals', auth_middleware_1.protect, savingsController.createGoal.bind(savingsController));
app.put('/api/savings/goals/:id', auth_middleware_1.protect, savingsController.updateGoal.bind(savingsController));
app.post('/api/savings/goals/:id/contribute', auth_middleware_1.protect, savingsController.addContribution.bind(savingsController));
app.delete('/api/savings/goals/:id', auth_middleware_1.protect, savingsController.deleteGoal.bind(savingsController));
// ============================================
// REPORT ROUTES
// ============================================
app.get('/api/reports/generate', auth_middleware_1.protect, reportController.generateReport.bind(reportController));
app.post('/api/reports/send', auth_middleware_1.protect, reportController.sendReport.bind(reportController));
app.get('/api/reports/export', auth_middleware_1.protect, reportController.getExportData.bind(reportController));
// ============================================
// 404 HANDLER
// ============================================
app.use(error_middleware_1.notFound);
// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use(error_middleware_1.errorHandler);
// ============================================
// SERVER
// ============================================
const PORT = Number(process.env.PORT) || 5003;
const server = app.listen(PORT, () => {
    logger_1.default.info(`🚀 Server running on port ${PORT}`);
    logger_1.default.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger_1.default.info(`🔗 API URL: http://localhost:${PORT}/api`);
    logger_1.default.info(`🌐 FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not set'}`);
});
// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', () => {
    logger_1.default.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger_1.default.info('HTTP server closed');
        redis_1.redisClient
            .disconnect()
            .catch((error) => {
            logger_1.default.error('Redis disconnect error:', error);
        });
        process.exit(0);
    });
});
// ============================================
// UNHANDLED PROMISE REJECTION
// ============================================
process.on('unhandledRejection', (error) => {
    logger_1.default.error('Unhandled Rejection:', error);
    server.close(() => {
        process.exit(1);
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map