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
dotenv_1.default.config();
const app = (0, express_1.default)();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
/* =========================
   DB CONNECTION
========================= */
(0, database_1.connectDB)();
redis_1.redisClient.connect();
/* =========================
   CONTROLLERS
========================= */
const authController = new auth_controller_1.AuthController();
const transactionController = new transaction_controller_1.TransactionController();
const budgetController = new budget_controller_1.BudgetController();
const analyticsController = new analytics_controller_1.AnalyticsController();
const savingsController = new savings_controller_1.SavingsController();
const reportController = new report_controller_1.ReportController();
/* =========================
   SECURITY
========================= */
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
/* =========================
   CORS FIX (IMPORTANT)
========================= */
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL,
    'https://frontend-two-theta-39.vercel.app'
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // allow Postman / server-to-server
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.log("❌ Blocked CORS origin:", origin);
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// IMPORTANT: preflight fix
app.options('*', (0, cors_1.default)());
/* =========================
   BASIC MIDDLEWARE
========================= */
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
/* =========================
   RATE LIMIT
========================= */
app.use('/api/', rateLimit_middleware_1.limiter);
app.use('/api/auth/', rateLimit_middleware_1.authLimiter);
/* =========================
   HEALTH ROUTES
========================= */
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'PaisaVedh API Running'
    });
});
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy'
    });
});
/* =========================
   AUTH ROUTES
========================= */
app.post('/api/auth/register', authController.register.bind(authController));
app.post('/api/auth/login', authController.login.bind(authController));
app.post('/api/auth/refresh', authController.refreshToken.bind(authController));
app.post('/api/auth/logout', auth_middleware_1.protect, authController.logout.bind(authController));
app.get('/api/auth/profile', auth_middleware_1.protect, authController.getProfile.bind(authController));
app.put('/api/auth/profile', auth_middleware_1.protect, authController.updateProfile.bind(authController));
app.put('/api/auth/change-password', auth_middleware_1.protect, authController.changePassword.bind(authController));
/* =========================
   OTHER ROUTES
========================= */
app.get('/api/transactions', auth_middleware_1.protect, transactionController.getTransactions.bind(transactionController));
app.post('/api/transactions', auth_middleware_1.protect, transactionController.createTransaction.bind(transactionController));
app.post('/api/transactions/upload-csv', auth_middleware_1.protect, upload.single('file'), transactionController.uploadCSV.bind(transactionController));
app.get('/api/budgets', auth_middleware_1.protect, budgetController.getBudgets.bind(budgetController));
app.get('/api/analytics/dashboard', auth_middleware_1.protect, analyticsController.getDashboardData.bind(analyticsController));
/* =========================
   ERROR HANDLERS
========================= */
app.use(error_middleware_1.notFound);
app.use(error_middleware_1.errorHandler);
/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    logger_1.default.info(`🚀 Server running on port ${PORT}`);
    logger_1.default.info(`🌍 Frontend: ${process.env.FRONTEND_URL}`);
});
//# sourceMappingURL=app.js.map