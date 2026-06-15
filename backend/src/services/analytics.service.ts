import { Transaction } from '../models/Transaction.model';
import { Budget } from '../models/Budget.model';
import { SavingsGoal } from '../models/SavingsGoal.model';
import { cacheService } from '../config/redis';
import mongoose from 'mongoose';
import logger from '../utils/logger';

interface TimeRange {
  startDate: Date;
  endDate: Date;
}

interface SpendingPattern {
  category: string;
  averageSpending: number;
  medianSpending: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  volatility: number;
  seasonalFactor: number;
}

interface FinancialHealthScore {
  overall: number;
  savings: number;
  budgeting: number;
  debtManagement: number;
  investment: number;
  recommendations: string[];
}

export class AnalyticsService {
  
  async getFinancialHealthScore(userId: string): Promise<FinancialHealthScore> {
    try {
      const cacheKey = `health_score:${userId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached as FinancialHealthScore;

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const transactions = await Transaction.find({
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: sixMonthsAgo },
      });

      const monthlyData = this.calculateMonthlyMetrics(transactions);
      const savingsGoals = await SavingsGoal.find({ userId: new mongoose.Types.ObjectId(userId) });
      const budgets = await Budget.find({ userId: new mongoose.Types.ObjectId(userId) });

      // Calculate individual scores (0-100)
      const savingsScore = this.calculateSavingsScore(monthlyData);
      const budgetingScore = this.calculateBudgetingScore(budgets, transactions);
      const debtScore = this.calculateDebtScore(transactions);
      const investmentScore = this.calculateInvestmentScore(transactions);

      const overall = (savingsScore + budgetingScore + debtScore + investmentScore) / 4;

      const recommendations = this.generateHealthRecommendations({
        savingsScore,
        budgetingScore,
        debtScore,
        investmentScore,
        monthlyData,
      });

      const healthScore = {
        overall: Math.round(overall),
        savings: Math.round(savingsScore),
        budgeting: Math.round(budgetingScore),
        debtManagement: Math.round(debtScore),
        investment: Math.round(investmentScore),
        recommendations,
      };

      // Cache for 6 hours
      await cacheService.set(cacheKey, healthScore, 21600);

      return healthScore;
    } catch (error) {
      logger.error('Get financial health score error:', error);
      throw error;
    }
  }

  async getSpendingPatterns(userId: string): Promise<SpendingPattern[]> {
    try {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const transactions = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: 'debit',
            date: { $gte: twelveMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              category: '$category',
              month: { $month: '$date' },
              year: { $year: '$date' },
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.category',
            monthlySpending: {
              $push: {
                month: '$_id.month',
                year: '$_id.year',
                amount: '$total',
              },
            },
            allAmounts: { $push: '$total' },
          },
        },
      ]);

      const patterns: SpendingPattern[] = [];

      for (const transaction of transactions) {
        const amounts = transaction.allAmounts;
        const sortedAmounts = [...amounts].sort((a, b) => a - b);
        
        const average = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
        const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)];
        const trend = this.calculateTrend(transaction.monthlySpending);
        const volatility = this.calculateVolatility(amounts);
        const seasonalFactor = this.calculateSeasonalFactor(transaction.monthlySpending);

        patterns.push({
          category: transaction._id,
          averageSpending: average,
          medianSpending: median,
          trend,
          volatility,
          seasonalFactor,
        });
      }

      return patterns;
    } catch (error) {
      logger.error('Get spending patterns error:', error);
      throw error;
    }
  }

  async getCashFlowForecast(userId: string, months: number = 3): Promise<any> {
    try {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const transactions = await Transaction.find({
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: twelveMonthsAgo },
      });

      // Calculate monthly averages
      const monthlyTotals = this.calculateMonthlyTotals(transactions);
      
      // Calculate growth rate
      const growthRate = this.calculateGrowthRate(monthlyTotals);
      
      // Forecast future months
      const forecast = [];
      const lastMonth = monthlyTotals[monthlyTotals.length - 1];
      
      for (let i = 1; i <= months; i++) {
        const predictedIncome = lastMonth.income * Math.pow(1 + growthRate.income, i);
        const predictedExpenses = lastMonth.expenses * Math.pow(1 + growthRate.expenses, i);
        
        forecast.push({
          month: this.getFutureMonth(i),
          predictedIncome,
          predictedExpenses,
          predictedSavings: predictedIncome - predictedExpenses,
          confidence: this.calculateConfidence(i, monthlyTotals.length),
        });
      }

      // Identify seasonal patterns
      const seasonalPatterns = this.identifySeasonalPatterns(monthlyTotals);

      return {
        forecast,
        seasonalPatterns,
        insights: this.generateForecastInsights(forecast, seasonalPatterns),
        recommendations: this.generateCashFlowRecommendations(forecast),
      };
    } catch (error) {
      logger.error('Get cash flow forecast error:', error);
      throw error;
    }
  }

  async getCategoryTrends(userId: string): Promise<any> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const trends = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: 'debit',
            date: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              category: '$category',
              month: { $month: '$date' },
              year: { $year: '$date' },
            },
            amount: { $sum: '$amount' },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
        {
          $group: {
            _id: '$_id.category',
            data: {
              $push: {
                month: '$_id.month',
                year: '$_id.year',
                amount: '$amount',
              },
            },
          },
        },
      ]);

      const processedTrends = [];
      for (const trend of trends) {
        const amounts = trend.data.map((d: any) => d.amount);
        const trendLine = this.calculateTrendLine(amounts);
        const prediction = this.predictNextMonth(amounts);
        
        processedTrends.push({
          category: trend._id,
          historical: trend.data,
          trendLine,
          prediction,
          growthRate: trendLine.slope / (amounts[0] || 1),
          volatility: this.calculateVolatility(amounts),
        });
      }

      return processedTrends;
    } catch (error) {
      logger.error('Get category trends error:', error);
      throw error;
    }
  }

  async getSavingsOpportunities(userId: string): Promise<any[]> {
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const transactions = await Transaction.find({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'debit',
        date: { $gte: threeMonthsAgo },
      });

      const opportunities = [];
      
      // Find recurring subscriptions
      const subscriptions = await this.identifySubscriptions(transactions);
      opportunities.push(...subscriptions);

      // Find expensive merchants
      const expensiveMerchants = await this.identifyExpensiveMerchants(transactions);
      opportunities.push(...expensiveMerchants);

      // Find inefficient categories
      const inefficientCategories = await this.identifyInefficientCategories(transactions);
      opportunities.push(...inefficientCategories);

      // Compare with benchmarks
      const benchmarkComparisons = await this.compareWithBenchmarks(transactions);
      opportunities.push(...benchmarkComparisons);

      // Sort by potential savings
      return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
    } catch (error) {
      logger.error('Get savings opportunities error:', error);
      throw error;
    }
  }

  private calculateMonthlyMetrics(transactions: any[]): any {
    const monthlyMap = new Map();
    
    for (const transaction of transactions) {
      const key = `${transaction.date.getFullYear()}-${transaction.date.getMonth()}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { income: 0, expenses: 0, savings: 0 });
      }
      
      const month = monthlyMap.get(key);
      if (transaction.type === 'credit') {
        month.income += transaction.amount;
      } else {
        month.expenses += transaction.amount;
      }
      month.savings = month.income - month.expenses;
    }
    
    const months = Array.from(monthlyMap.values());
    const avgSavings = months.reduce((sum, m) => sum + m.savings, 0) / months.length;
    const savingsRate = months.reduce((sum, m) => sum + (m.savings / m.income), 0) / months.length;
    
    return {
      monthlyData: months,
      averageSavings: avgSavings,
      averageSavingsRate: savingsRate,
      monthsWithPositiveSavings: months.filter(m => m.savings > 0).length,
    };
  }

  private calculateSavingsScore(monthlyData: any): number {
    const { averageSavingsRate, monthsWithPositiveSavings, monthlyData } = monthlyData;
    
    let score = 0;
    
    // Savings rate score (30% of total)
    if (averageSavingsRate >= 0.2) score += 30;
    else if (averageSavingsRate >= 0.1) score += 20;
    else if (averageSavingsRate >= 0.05) score += 10;
    else score += 5;
    
    // Consistency score (40% of total)
    const consistency = monthsWithPositiveSavings / monthlyData.monthlyData.length;
    score += consistency * 40;
    
    // Growth trend (30% of total)
    const savingsTrend = this.calculateTrend(monthlyData.monthlyData.map((m: any) => m.savings));
    if (savingsTrend === 'increasing') score += 30;
    else if (savingsTrend === 'stable') score += 15;
    
    return score;
  }

  private calculateBudgetingScore(budgets: any[], transactions: any[]): number {
    if (budgets.length === 0) return 50;
    
    let totalBudget = 0;
    let totalOverspend = 0;
    
    for (const budget of budgets) {
      totalBudget += budget.amount;
      const spent = transactions
        .filter(t => t.category === budget.category && t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);
      
      if (spent > budget.amount) {
        totalOverspend += spent - budget.amount;
      }
    }
    
    const overspendRatio = totalOverspend / totalBudget;
    const score = Math.max(0, 100 - (overspendRatio * 100));
    
    return score;
  }

  private calculateDebtScore(transactions: any[]): number {
    // Simplified debt score calculation
    const debtTransactions = transactions.filter(t => 
      t.category === 'Loan Payment' || t.category === 'Credit Card Payment'
    );
    
    if (debtTransactions.length === 0) return 80;
    
    const totalDebtPayments = debtTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const debtToIncomeRatio = totalDebtPayments / totalIncome;
    
    if (debtToIncomeRatio < 0.2) return 90;
    if (debtToIncomeRatio < 0.3) return 70;
    if (debtToIncomeRatio < 0.4) return 50;
    if (debtToIncomeRatio < 0.5) return 30;
    return 10;
  }

  private calculateInvestmentScore(transactions: any[]): number {
    const investmentTransactions = transactions.filter(t => 
      t.category === 'Investments'
    );
    
    if (investmentTransactions.length === 0) return 0;
    
    const totalInvestments = investmentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const investmentRate = totalInvestments / totalIncome;
    
    if (investmentRate >= 0.15) return 100;
    if (investmentRate >= 0.1) return 80;
    if (investmentRate >= 0.05) return 60;
    if (investmentRate >= 0.02) return 40;
    return 20;
  }

  private generateHealthRecommendations(metrics: any): string[] {
    const recommendations = [];
    
    if (metrics.savingsScore < 60) {
      recommendations.push('Increase your savings rate to at least 20% of your income');
      recommendations.push('Set up automatic transfers to a savings account each month');
    }
    
    if (metrics.budgetingScore < 60) {
      recommendations.push('Create and stick to a monthly budget using the 50/30/20 rule');
      recommendations.push('Review your expenses weekly to identify overspending areas');
    }
    
    if (metrics.debtScore < 60) {
      recommendations.push('Focus on paying off high-interest debt first (avalanche method)');
      recommendations.push('Consider debt consolidation for better interest rates');
    }
    
    if (metrics.investmentScore < 40) {
      recommendations.push('Start investing at least 15% of your income for retirement');
      recommendations.push('Explore low-cost index funds for beginner investors');
    }
    
    return recommendations.slice(0, 5);
  }

  private calculateTrend(data: any[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = ((avgSecond - avgFirst) / avgFirst) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  private calculateVolatility(numbers: number[]): number {
    if (numbers.length < 2) return 0;
    
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    
    return Math.sqrt(variance) / mean;
  }

  private calculateSeasonalFactor(data: any[]): number {
    // Simplified seasonal factor calculation
    const monthlyAverages = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);
    
    for (const item of data) {
      monthlyAverages[item.month - 1] += item.amount;
      monthlyCounts[item.month - 1]++;
    }
    
    for (let i = 0; i < 12; i++) {
      if (monthlyCounts[i] > 0) {
        monthlyAverages[i] /= monthlyCounts[i];
      }
    }
    
    const overallAverage = monthlyAverages.reduce((a, b) => a + b, 0) / 12;
    const currentMonth = new Date().getMonth();
    
    return monthlyAverages[currentMonth] / overallAverage;
  }

  private calculateMonthlyTotals(transactions: any[]): any[] {
    const monthlyMap = new Map();
    
    for (const transaction of transactions) {
      const key = `${transaction.date.getFullYear()}-${transaction.date.getMonth()}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { income: 0, expenses: 0, month: transaction.date.getMonth(), year: transaction.date.getFullYear() });
      }
      
      const month = monthlyMap.get(key);
      if (transaction.type === 'credit') {
        month.income += transaction.amount;
      } else {
        month.expenses += transaction.amount;
      }
    }
    
    return Array.from(monthlyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }

  private calculateGrowthRate(monthlyTotals: any[]): { income: number; expenses: number } {
    if (monthlyTotals.length < 2) return { income: 0, expenses: 0 };
    
    const incomeGrowth = (monthlyTotals[monthlyTotals.length - 1].income - monthlyTotals[0].income) / monthlyTotals[0].income / monthlyTotals.length;
    const expensesGrowth = (monthlyTotals[monthlyTotals.length - 1].expenses - monthlyTotals[0].expenses) / monthlyTotals[0].expenses / monthlyTotals.length;
    
    return {
      income: Math.max(-0.1, Math.min(0.1, incomeGrowth)),
      expenses: Math.max(-0.1, Math.min(0.1, expensesGrowth)),
    };
  }

  private getFutureMonth(monthsFromNow: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() + monthsFromNow);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  }

  private calculateConfidence(monthsAhead: number, dataPoints: number): number {
    // Confidence decreases the further we forecast
    const baseConfidence = Math.min(0.9, dataPoints / 24);
    return Math.max(0.3, baseConfidence * (1 - monthsAhead * 0.1));
  }

  private identifySeasonalPatterns(monthlyTotals: any[]): any {
    const seasonalIndex = new Array(12).fill(0);
    const seasonalCount = new Array(12).fill(0);
    
    for (const month of monthlyTotals) {
      seasonalIndex[month.month] += month.expenses;
      seasonalCount[month.month]++;
    }
    
    for (let i = 0; i < 12; i++) {
      if (seasonalCount[i] > 0) {
        seasonalIndex[i] /= seasonalCount[i];
      }
    }
    
    const average = seasonalIndex.reduce((a, b) => a + b, 0) / 12;
    const peakMonths = seasonalIndex
      .map((value, index) => ({ month: index, value }))
      .filter(item => item.value > average * 1.2)
      .map(item => item.month);
    
    return {
      peakMonths,
      seasonalFactors: seasonalIndex.map(v => v / average),
    };
  }

  private generateForecastInsights(forecast: any[], seasonalPatterns: any): string[] {
    const insights = [];
    const peakMonthNames = seasonalPatterns.peakMonths.map(m => 
      new Date(2000, m, 1).toLocaleString('default', { month: 'long' })
    );
    
    if (peakMonthNames.length > 0) {
      insights.push(`Your spending typically peaks in ${peakMonthNames.join(', ')}. Plan accordingly.`);
    }
    
    const avgPredictedSavings = forecast.reduce((sum: number, f: any) => sum + f.predictedSavings, 0) / forecast.length;
    if (avgPredictedSavings < 0) {
      insights.push('Warning: Your predicted cash flow is negative. Consider reducing expenses or increasing income.');
    } else if (avgPredictedSavings > 0) {
      insights.push(`You're on track to save ₹${avgPredictedSavings.toFixed(0)} per month on average.`);
    }
    
    return insights;
  }

  private generateCashFlowRecommendations(forecast: any[]): string[] {
    const recommendations = [];
    const negativeMonths = forecast.filter((f: any) => f.predictedSavings < 0);
    
    if (negativeMonths.length > 0) {
      recommendations.push(`You may face cash flow shortages in ${negativeMonths.length} of the next ${forecast.length} months. Build an emergency fund.`);
    }
    
    return recommendations;
  }

  private calculateTrendLine(data: number[]): { slope: number; intercept: number } {
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }

  private predictNextMonth(data: number[]): number {
    const { slope, intercept } = this.calculateTrendLine(data);
    return slope * data.length + intercept;
  }

  private async identifySubscriptions(transactions: any[]): Promise<any[]> {
    const subscriptions = [];
    const merchantMap = new Map();
    
    for (const transaction of transactions) {
      if (!merchantMap.has(transaction.merchant)) {
        merchantMap.set(transaction.merchant, []);
      }
      merchantMap.get(transaction.merchant).push(transaction);
    }
    
    for (const [merchant, trans] of merchantMap) {
      if (trans.length >= 3 && this.isRecurringPattern(trans)) {
        const averageAmount = trans.reduce((sum: number, t: any) => sum + t.amount, 0) / trans.length;
        subscriptions.push({
          type: 'subscription',
          merchant,
          currentSpending: averageAmount * 12,
          potentialSavings: averageAmount * 12 * 0.3, // Assume 30% can be saved
          recommendation: `Review your ${merchant} subscription - consider if you need it`,
        });
      }
    }
    
    return subscriptions;
  }

  private isRecurringPattern(transactions: any[]): boolean {
    if (transactions.length < 2) return false;
    
    const dates = transactions.map((t: any) => t.date.getTime());
    const intervals = [];
    
    for (let i = 1; i < dates.length; i++) {
      intervals.push((dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24));
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - avgInterval, 2), 0) / intervals.length;
    
    // Check if intervals are consistent (variance < 5 days for monthly)
    return variance < 5;
  }

  private async identifyExpensiveMerchants(transactions: any[]): Promise<any[]> {
    const merchantMap = new Map();
    
    for (const transaction of transactions) {
      if (!merchantMap.has(transaction.merchant)) {
        merchantMap.set(transaction.merchant, []);
      }
      merchantMap.get(transaction.merchant).push(transaction);
    }
    
    const expensive = [];
    for (const [merchant, trans] of merchantMap) {
      const totalSpent = trans.reduce((sum: number, t: any) => sum + t.amount, 0);
      const averagePerTransaction = totalSpent / trans.length;
      
      if (totalSpent > 10000) { // More than ₹10,000
        expensive.push({
          type: 'expensive_merchant',
          merchant,
          currentSpending: totalSpent,
          potentialSavings: totalSpent * 0.2, // Assume 20% can be saved
          recommendation: `You spent ₹${totalSpent.toFixed(0)} at ${merchant}. Consider finding cheaper alternatives.`,
        });
      }
    }
    
    return expensive;
  }

  private async identifyInefficientCategories(transactions: any[]): Promise<any[]> {
    const categoryMap = new Map();
    
    for (const transaction of transactions) {
      if (!categoryMap.has(transaction.category)) {
        categoryMap.set(transaction.category, []);
      }
      categoryMap.get(transaction.category).push(transaction);
    }
    
    const inefficient = [];
    for (const [category, trans] of categoryMap) {
      const totalSpent = trans.reduce((sum: number, t: any) => sum + t.amount, 0);
      const growth = this.calculateTrend(trans.map((t: any, i: number) => t.amount));
      
      if (growth === 'increasing' && totalSpent > 5000) {
        inefficient.push({
          type: 'inefficient_category',
          category,
          currentSpending: totalSpent,
          potentialSavings: totalSpent * 0.15,
          recommendation: `Your ${category} spending is increasing. Set a budget and track expenses in this category.`,
        });
      }
    }
    
    return inefficient;
  }

  private async compareWithBenchmarks(transactions: any[]): Promise<any[]> {
    // Industry benchmarks (simplified)
    const benchmarks = {
      'Food & Dining': 0.15,
      'Shopping': 0.10,
      'Entertainment': 0.05,
      'Transportation': 0.10,
    };
    
    const totalIncome = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const categorySpending = new Map();
    for (const transaction of transactions) {
      if (transaction.type === 'debit') {
        const current = categorySpending.get(transaction.category) || 0;
        categorySpending.set(transaction.category, current + transaction.amount);
      }
    }
    
    const comparisons = [];
    for (const [category, spent] of categorySpending) {
      const benchmark = benchmarks[category as keyof typeof benchmarks];
      if (benchmark) {
        const idealSpending = totalIncome * benchmark;
        if (spent > idealSpending * 1.2) {
          comparisons.push({
            type: 'benchmark',
            category,
            currentSpending: spent,
            potentialSavings: spent - idealSpending,
            recommendation: `Your ${category} spending is ${Math.round((spent / idealSpending - 1) * 100)}% above the ideal benchmark.`,
          });
        }
      }
    }
    
    return comparisons;
  }
}

export const analyticsService = new AnalyticsService();