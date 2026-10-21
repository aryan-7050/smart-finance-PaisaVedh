import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';
import dotenv from 'dotenv';

import { connectDB } from './config/database';
import { redisClient } from './config/redis';

import {
  errorHandler,
  notFound,
} from './middleware/error.middleware';

import {
  limiter,
  authLimiter,
} from './middleware/rateLimit.middleware';

import { protect } from './middleware/auth.middleware';

import { AuthController } from './controllers/auth.controller';
import { TransactionController } from './controllers/transaction.controller';
import { BudgetController } from './controllers/budget.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { SavingsController } from './controllers/savings.controller';
import { ReportController } from './controllers/report.controller';

import logger from './utils/logger';


dotenv.config();

const app = express();

app.set('trust proxy', 1);


const developmentOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://localhost:5002',
  'http://localhost:5003',
];

const productionOrigins = [
  'https://smart-finance-paisa-vedh.vercel.app',
  'https://paisavedh-frontend.vercel.app',
  'https://paisavedh.vercel.app',
  'https://smart-finance-paisavedh.vercel.app',
];

// Optional additional frontend origin from Render environment variables
const configuredFrontendUrl = process.env.FRONTEND_URL
  ?.trim()
  .replace(/\/+$/, '');

if (configuredFrontendUrl) {
  productionOrigins.push(configuredFrontendUrl);
}

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = isProduction
  ? productionOrigins
  : developmentOrigins;

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header, such as server-to-server calls.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`Blocked by CORS: ${origin}`);

    return callback(null, false);
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

  optionsSuccessStatus: 204,
};


app.use(cors(corsOptions));

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

app.use(compression());

app.use(
  express.json({
    limit: '10mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);


const upload = multer({
  dest: 'uploads/',
});

connectDB();

redisClient.connect().catch((error) => {
  logger.error('Redis connection failed:', error);
});


const authController = new AuthController();
const transactionController = new TransactionController();
const budgetController = new BudgetController();
const analyticsController = new AnalyticsController();
const savingsController = new SavingsController();
const reportController = new ReportController();

// ============================================
// RATE LIMITING
// ============================================

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// ============================================
// FAVICON
// ============================================

app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

// ============================================
// HEALTH & TEST ROUTES
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

app.post(
  '/api/auth/register',
  authController.register.bind(authController)
);

app.post(
  '/api/auth/login',
  authController.login.bind(authController)
);

app.post(
  '/api/auth/refresh',
  authController.refreshToken.bind(authController)
);

app.post(
  '/api/auth/logout',
  protect,
  authController.logout.bind(authController)
);

app.get(
  '/api/auth/profile',
  protect,
  authController.getProfile.bind(authController)
);

app.put(
  '/api/auth/profile',
  protect,
  authController.updateProfile.bind(authController)
);

app.put(
  '/api/auth/change-password',
  protect,
  authController.changePassword.bind(authController)
);

// ============================================
// TRANSACTION ROUTES
// ============================================

app.get(
  '/api/transactions',
  protect,
  transactionController.getTransactions.bind(transactionController)
);

app.post(
  '/api/transactions',
  protect,
  transactionController.createTransaction.bind(transactionController)
);

app.post(
  '/api/transactions/upload-csv',
  protect,
  upload.single('file'),
  transactionController.uploadCSV.bind(transactionController)
);

app.get(
  '/api/transactions/stats',
  protect,
  transactionController.getTransactionStats.bind(transactionController)
);

app.put(
  '/api/transactions/:id',
  protect,
  transactionController.updateTransaction.bind(transactionController)
);

app.delete(
  '/api/transactions/:id',
  protect,
  transactionController.deleteTransaction.bind(transactionController)
);

// ============================================
// BUDGET ROUTES
// ============================================

app.get(
  '/api/budgets',
  protect,
  budgetController.getBudgets.bind(budgetController)
);

app.post(
  '/api/budgets',
  protect,
  budgetController.createBudget.bind(budgetController)
);

app.put(
  '/api/budgets/:id',
  protect,
  budgetController.updateBudget.bind(budgetController)
);

app.delete(
  '/api/budgets/:id',
  protect,
  budgetController.deleteBudget.bind(budgetController)
);

app.get(
  '/api/budgets/alerts',
  protect,
  budgetController.getBudgetAlerts.bind(budgetController)
);

// ============================================
// ANALYTICS ROUTES
// ============================================

app.get(
  '/api/analytics/dashboard',
  protect,
  analyticsController.getDashboardData.bind(analyticsController)
);

app.get(
  '/api/analytics/insights',
  protect,
  analyticsController.getSpendingInsights.bind(analyticsController)
);

app.get(
  '/api/analytics/cashflow',
  protect,
  analyticsController.getCashFlow.bind(analyticsController)
);

// ============================================
// SAVINGS ROUTES
// ============================================

app.get(
  '/api/savings/goals',
  protect,
  savingsController.getGoals.bind(savingsController)
);

app.post(
  '/api/savings/goals',
  protect,
  savingsController.createGoal.bind(savingsController)
);

app.put(
  '/api/savings/goals/:id',
  protect,
  savingsController.updateGoal.bind(savingsController)
);

app.post(
  '/api/savings/goals/:id/contribute',
  protect,
  savingsController.addContribution.bind(savingsController)
);

app.delete(
  '/api/savings/goals/:id',
  protect,
  savingsController.deleteGoal.bind(savingsController)
);

// ============================================
// REPORT ROUTES
// ============================================

app.get(
  '/api/reports/generate',
  protect,
  reportController.generateReport.bind(reportController)
);

app.post(
  '/api/reports/send',
  protect,
  reportController.sendReport.bind(reportController)
);

app.get(
  '/api/reports/export',
  protect,
  reportController.getExportData.bind(reportController)
);

// ============================================
// 404 & GLOBAL ERROR HANDLERS
// ============================================

app.use(notFound);
app.use(errorHandler);

// ============================================
// SERVER
// ============================================

const PORT = Number(process.env.PORT) || 5003;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API URL: /api`);
  logger.info(`🌐 FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  logger.info(`🔐 CORS allowed origins: ${allowedOrigins.join(', ')}`);
});


process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');

  server.close(() => {
    logger.info('HTTP server closed');

    redisClient.disconnect().catch((error) => {
      logger.error('Redis disconnect error:', error);
    });

    process.exit(0);
  });
});


process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);

  server.close(() => {
    process.exit(1);
  });
});

export default app;
