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
import { monthlyReportJob } from './jobs/monthlyReport.job';
import { recurringDetectionJob } from './jobs/recurringDetection.job';
import { budgetAlertJob } from './jobs/budgetAlert.job';
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
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

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

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;