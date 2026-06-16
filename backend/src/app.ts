import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import multer from 'multer';

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
   CONTROLLERS
========================= */
const authController = new AuthController();
const transactionController = new TransactionController();
const budgetController = new BudgetController();
const analyticsController = new AnalyticsController();
const savingsController = new SavingsController();
const reportController = new ReportController();

/* =========================
   DB CONNECTION
========================= */
connectDB();
redisClient.connect();

/* =========================
   SECURITY
========================= */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

/* =========================
   CORS (FIXED)
========================= */

const allowedOrigins = [
  'http://localhost:5173',
  'https://frontend-two-theta-39.vercel.app' // ✅ FIXED
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS blocked'), false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/* ✅ FIX: explicit OPTIONS handler */
app.options('*', cors());

/* =========================
   BASIC MIDDLEWARE
========================= */
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* =========================
   ROUTES
========================= */

// Root
app.get('/', (req, res) => {
  res.json({ success: true, message: 'PaisaVedh API Running' });
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

/* =========================
   AUTH
========================= */
app.post('/api/auth/register', authController.register.bind(authController));
app.post('/api/auth/login', authController.login.bind(authController));
app.post('/api/auth/logout', protect, authController.logout.bind(authController));
app.post('/api/auth/refresh', authController.refreshToken.bind(authController));
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
   BUDGET
========================= */
app.post('/api/budgets', protect, budgetController.createBudget.bind(budgetController));
app.get('/api/budgets', protect, budgetController.getBudgets.bind(budgetController));
app.get('/api/budgets/alerts', protect, budgetController.getBudgetAlerts.bind(budgetController));
app.put('/api/budgets/:id', protect, budgetController.updateBudget.bind(budgetController));
app.delete('/api/budgets/:id', protect, budgetController.deleteBudget.bind(budgetController));

/* =========================
   ANALYTICS
========================= */
app.get('/api/analytics/dashboard', protect, analyticsController.getDashboardData.bind(analyticsController));
app.get('/api/analytics/insights', protect, analyticsController.getSpendingInsights.bind(analyticsController));
app.get('/api/analytics/cashflow', protect, analyticsController.getCashFlow.bind(analyticsController));

/* =========================
   SAVINGS
========================= */
app.post('/api/savings/goals', protect, savingsController.createGoal.bind(savingsController));
app.get('/api/savings/goals', protect, savingsController.getGoals.bind(savingsController));
app.put('/api/savings/goals/:id', protect, savingsController.updateGoal.bind(savingsController));
app.post('/api/savings/goals/:id/contribute', protect, savingsController.addContribution.bind(savingsController));
app.delete('/api/savings/goals/:id', protect, savingsController.deleteGoal.bind(savingsController));

/* =========================
   REPORTS
========================= */
app.get('/api/reports/generate', protect, reportController.generateReport.bind(reportController));
app.post('/api/reports/send', protect, reportController.sendReport.bind(reportController));
app.get('/api/reports/export', protect, reportController.getExportData.bind(reportController));

/* =========================
   ERROR HANDLERS
========================= */
app.use(notFound);
app.use(errorHandler);

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  logger.info(`Server running on ${PORT}`);
});