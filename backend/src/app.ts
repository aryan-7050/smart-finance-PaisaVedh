import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';
import dotenv from 'dotenv';

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

import logger from './utils/logger';

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

/* =========================
   RENDER FIX
========================= */
app.set('trust proxy', 1);

/* =========================
   DATABASE CONNECTION
========================= */
connectDB();

redisClient.connect().catch((err) => {
  console.error('Redis connection failed:', err);
});

/* =========================
   CONTROLLERS
========================= */
const authController = new AuthController();
const transactionController = new TransactionController();
const budgetController = new BudgetController();
const analyticsController = new AnalyticsController();
const savingsController = new SavingsController();
const reportController = new ReportController();

/* =========================
   SECURITY
========================= */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

/* =========================
   CORS
========================= */
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://paisavedh.vercel.app',
  'https://frontend-two-theta-39.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log('Blocked Origin:', origin);

      return callback(new Error('CORS Not Allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.options('*', cors());

/* =========================
   BASIC MIDDLEWARE
========================= */
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* =========================
   RATE LIMIT
========================= */
app.use('/api', limiter);
app.use('/api/auth', authLimiter);

/* =========================
   TEST ROUTES
========================= */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PaisaVedh Backend Running',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PaisaVedh API Active',
  });
});

/* =========================
   AUTH ROUTES
========================= */
app.post('/api/auth/register', authController.register.bind(authController));
app.post('/api/auth/login', authController.login.bind(authController));
app.post('/api/auth/refresh', authController.refreshToken.bind(authController));

app.post('/api/auth/logout', protect, authController.logout.bind(authController));
app.get('/api/auth/profile', protect, authController.getProfile.bind(authController));
app.put('/api/auth/profile', protect, authController.updateProfile.bind(authController));
app.put('/api/auth/change-password', protect, authController.changePassword.bind(authController));

/* =========================
   TRANSACTIONS
========================= */
app.get('/api/transactions', protect, transactionController.getTransactions.bind(transactionController));
app.post('/api/transactions', protect, transactionController.createTransaction.bind(transactionController));
app.post('/api/transactions/upload-csv', protect, upload.single('file'), transactionController.uploadCSV.bind(transactionController));
app.get('/api/transactions/stats', protect, transactionController.getTransactionStats.bind(transactionController));
app.put('/api/transactions/:id', protect, transactionController.updateTransaction.bind(transactionController));
app.delete('/api/transactions/:id', protect, transactionController.deleteTransaction.bind(transactionController));

/* =========================
   BUDGETS
========================= */
app.get('/api/budgets', protect, budgetController.getBudgets.bind(budgetController));
app.post('/api/budgets', protect, budgetController.createBudget.bind(budgetController));

/* =========================
   ANALYTICS
========================= */
app.get('/api/analytics/dashboard', protect, analyticsController.getDashboardData.bind(analyticsController));

/* =========================
   SAVINGS
========================= */
app.get('/api/savings/goals', protect, savingsController.getGoals.bind(savingsController));

/* =========================
   REPORTS
========================= */
app.get('/api/reports/generate', protect, reportController.generateReport.bind(reportController));

/* =========================
   ERROR HANDLER
========================= */
app.use(notFound);
app.use(errorHandler);

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🌍 FRONTEND_URL: ${process.env.FRONTEND_URL}`);
});

export default app;