import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { connectDB } from './config/database';
import { redisClient } from './config/redis';
import { errorHandler, notFound } from './middleware/error.middleware';
import { limiter, authLimiter } from './middleware/rateLimit.middleware';
import { protect } from './middleware/auth.middleware';
import { AuthController } from './controllers/auth.controller';
import { TransactionController } from './controllers/transaction.controller';
import { BudgetController } from './controllers/budget.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { SavingsController } from './controllers/savings.controller';
import { ReportController } from './controllers/report.controller';
import multer from 'multer';
import logger from './utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Initialize controllers
const authController = new AuthController();
const transactionController = new TransactionController();
const budgetController = new BudgetController();
const analyticsController = new AnalyticsController();
const savingsController = new SavingsController();
const reportController = new ReportController();

// Connect to databases
connectDB();
redisClient.connect();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(
  cors({
    origin: [
      'http://localhost:5173', // Local development
      process.env.FRONTEND_URL || 'https://frontend-two-theta-39.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ========== ADD THESE ROUTES ==========

// ✅ Root route - Fixes "Not Found - /" error
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to PaisaVedh API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      transactions: '/api/transactions',
      budgets: '/api/budgets',
      analytics: '/api/analytics',
      savings: '/api/savings',
      reports: '/api/reports'
    }
  });
});

// ✅ Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ✅ API info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PaisaVedh API',
    version: '1.0.0',
    documentation: 'https://github.com/aryan-7050/smart-finance-PaisaVedh',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        changePassword: 'PUT /api/auth/change-password'
      },
      transactions: {
        list: 'GET /api/transactions',
        create: 'POST /api/transactions',
        update: 'PUT /api/transactions/:id',
        delete: 'DELETE /api/transactions/:id',
        uploadCSV: 'POST /api/transactions/upload-csv'
      },
      budgets: {
        list: 'GET /api/budgets',
        create: 'POST /api/budgets',
        update: 'PUT /api/budgets/:id',
        delete: 'DELETE /api/budgets/:id',
        alerts: 'GET /api/budgets/alerts'
      },
      analytics: {
        dashboard: 'GET /api/analytics/dashboard',
        insights: 'GET /api/analytics/insights',
        cashflow: 'GET /api/analytics/cashflow'
      },
      savings: {
        list: 'GET /api/savings/goals',
        create: 'POST /api/savings/goals',
        contribute: 'POST /api/savings/goals/:id/contribute'
      },
      reports: {
        generate: 'GET /api/reports/generate',
        export: 'GET /api/reports/export',
        send: 'POST /api/reports/send'
      }
    }
  });
});

// ========== API ROUTES ==========

// Auth Routes
app.post('/api/auth/register', authController.register.bind(authController));
app.post('/api/auth/login', authController.login.bind(authController));
app.post('/api/auth/refresh', authController.refreshToken.bind(authController));
app.post('/api/auth/logout', protect, authController.logout.bind(authController));
app.get('/api/auth/profile', protect, authController.getProfile.bind(authController));
app.put('/api/auth/profile', protect, authController.updateProfile.bind(authController));
app.put('/api/auth/change-password', protect, authController.changePassword.bind(authController));

// Transaction Routes
app.get('/api/transactions', protect, transactionController.getTransactions.bind(transactionController));
app.post('/api/transactions', protect, transactionController.createTransaction.bind(transactionController));
app.post('/api/transactions/upload-csv', protect, upload.single('file'), transactionController.uploadCSV.bind(transactionController));
app.get('/api/transactions/stats', protect, transactionController.getTransactionStats.bind(transactionController));
app.put('/api/transactions/:id', protect, transactionController.updateTransaction.bind(transactionController));
app.delete('/api/transactions/:id', protect, transactionController.deleteTransaction.bind(transactionController));

// Budget Routes
app.post('/api/budgets', protect, budgetController.createBudget.bind(budgetController));
app.get('/api/budgets', protect, budgetController.getBudgets.bind(budgetController));
app.get('/api/budgets/alerts', protect, budgetController.getBudgetAlerts.bind(budgetController));
app.put('/api/budgets/:id', protect, budgetController.updateBudget.bind(budgetController));
app.delete('/api/budgets/:id', protect, budgetController.deleteBudget.bind(budgetController));

// Analytics Routes
app.get('/api/analytics/dashboard', protect, analyticsController.getDashboardData.bind(analyticsController));
app.get('/api/analytics/insights', protect, analyticsController.getSpendingInsights.bind(analyticsController));
app.get('/api/analytics/cashflow', protect, analyticsController.getCashFlow.bind(analyticsController));

// Savings Routes
app.post('/api/savings/goals', protect, savingsController.createGoal.bind(savingsController));
app.get('/api/savings/goals', protect, savingsController.getGoals.bind(savingsController));
app.put('/api/savings/goals/:id', protect, savingsController.updateGoal.bind(savingsController));
app.post('/api/savings/goals/:id/contribute', protect, savingsController.addContribution.bind(savingsController));
app.delete('/api/savings/goals/:id', protect, savingsController.deleteGoal.bind(savingsController));

// Report Routes
app.get('/api/reports/generate', protect, reportController.generateReport.bind(reportController));
app.post('/api/reports/send', protect, reportController.sendReport.bind(reportController));
app.get('/api/reports/export', protect, reportController.getExportData.bind(reportController));

// ========== ERROR HANDLING ==========

// 404 handler for undefined routes (MUST be after all other routes)
app.use(notFound);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5002;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API available at: http://localhost:${PORT}/api`);
  logger.info(`❤️ Health check: http://localhost:${PORT}/health`);
  logger.info(`🏠 Root: http://localhost:${PORT}/`);
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  server.close(async () => {
    logger.info('HTTP server closed');
    await redisClient.disconnect();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;