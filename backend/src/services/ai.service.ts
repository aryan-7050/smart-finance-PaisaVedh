import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.model';

type SpendingTrend = 'increasing' | 'decreasing' | 'stable';

interface MonthlySpending {
  category: string;
  month: number;
  year: number;
  totalAmount: number;
  transactionCount: number;
}

interface SpendingPattern {
  category: string;
  averageSpending: number;
  trend: SpendingTrend;
  recommendations: string[];
}

interface MonthlyTotal {
  month: number;
  year: number;
  total: number;
}

interface SpendingInsights {
  patterns: SpendingPattern[];
  recommendations: string[];
  savingsOpportunities: Array<{
    type: 'subscription';
    merchant: string;
    potentialSavings: number;
    description: string;
    priority: 'medium';
  }>;
  predictedNextMonthExpenses: number;
}

const MONTHS_TO_ANALYZE = 6;
const MONTHS_TO_PREDICT = 3;

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date: Date, amount: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth() + amount,
    1
  );
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export class AIService {
  async generateSpendingInsights(
    userId: string
  ): Promise<SpendingInsights> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    try {
      const now = new Date();
      const currentMonth = getMonthStart(now);

      // Include the current calendar month and five previous months.
      const startDate = shiftMonth(
        currentMonth,
        -(MONTHS_TO_ANALYZE - 1)
      );

      const transactions = (await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            date: { $gte: startDate, $lte: now },
            type: 'debit',
          },
        },
        {
          $group: {
            _id: {
              category: '$category',
              month: { $month: '$date' },
              year: { $year: '$date' },
            },
            totalAmount: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
          },
        },
        {
          $sort: {
            '_id.year': 1,
            '_id.month': 1,
          },
        },
      ])) as Array<{
        _id: {
          category: string;
          month: number;
          year: number;
        };
        totalAmount: number;
        transactionCount: number;
      }>;

      const monthlySpending: MonthlySpending[] =
        transactions.map((item) => ({
          category: item._id.category || 'Uncategorized',
          month: item._id.month,
          year: item._id.year,
          totalAmount: item.totalAmount,
          transactionCount: item.transactionCount,
        }));

      const patterns = this.detectSpendingPatterns(
        monthlySpending,
        startDate,
        MONTHS_TO_ANALYZE
      );

      const recommendations =
        this.generateRecommendations(patterns);

      const savingsOpportunities =
        await this.findSavingsOpportunities(userId);

      const predictedNextMonthExpenses =
        await this.predictNextMonthExpenses(userId);

      return {
        patterns,
        recommendations,
        savingsOpportunities,
        predictedNextMonthExpenses,
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  private detectSpendingPatterns(
    transactions: MonthlySpending[],
    startDate: Date,
    numberOfMonths: number
  ): SpendingPattern[] {
    const categories = new Map<
      string,
      Map<string, number>
    >();

    for (const transaction of transactions) {
      if (!categories.has(transaction.category)) {
        categories.set(transaction.category, new Map());
      }

      const key = monthKey(
        transaction.year,
        transaction.month
      );

      const monthlyTotals = categories.get(
        transaction.category
      )!;

      monthlyTotals.set(
        key,
        (monthlyTotals.get(key) || 0) +
          transaction.totalAmount
      );
    }

    const patterns: SpendingPattern[] = [];

    for (const [category, monthlyTotals] of categories) {
      const amounts: number[] = [];

      // Include zero-spending months in the analysis.
      for (let i = 0; i < numberOfMonths; i++) {
        const date = shiftMonth(startDate, i);

        amounts.push(
          monthlyTotals.get(
            monthKey(date.getFullYear(), date.getMonth() + 1)
          ) || 0
        );
      }

      const averageSpending =
        amounts.reduce((sum, amount) => sum + amount, 0) /
        numberOfMonths;

      const trend = this.calculateTrend(amounts);

      patterns.push({
        category,
        averageSpending: Math.round(averageSpending * 100) / 100,
        trend,
        recommendations: this.getCategoryRecommendations(
          category,
          trend
        ),
      });
    }

    return patterns.sort(
      (a, b) => b.averageSpending - a.averageSpending
    );
  }

  private calculateTrend(
    amounts: number[]
  ): SpendingTrend {
    if (amounts.length < 2) {
      return 'stable';
    }

    const splitIndex = Math.floor(amounts.length / 2);

    const firstHalf = amounts.slice(0, splitIndex);
    const secondHalf = amounts.slice(splitIndex);

    const firstAverage =
      firstHalf.reduce((sum, amount) => sum + amount, 0) /
      firstHalf.length;

    const secondAverage =
      secondHalf.reduce((sum, amount) => sum + amount, 0) /
      secondHalf.length;

    if (firstAverage === 0) {
      return secondAverage > 0 ? 'increasing' : 'stable';
    }

    const percentChange =
      ((secondAverage - firstAverage) / firstAverage) * 100;

    if (percentChange > 10) return 'increasing';
    if (percentChange < -10) return 'decreasing';

    return 'stable';
  }

  private getCategoryRecommendations(
    category: string,
    trend: SpendingTrend
  ): string[] {
    const recommendations: Record<
      string,
      Record<SpendingTrend, string[]>
    > = {
      'Food & Dining': {
        increasing: [
          'Your food expenses are rising. Consider meal prepping.',
          'Review dining-out expenses and set a weekly limit.',
        ],
        decreasing: [
          'Your food spending has decreased. Keep tracking expenses.',
          'Consider directing some savings toward your financial goals.',
        ],
        stable: [
          'Your food spending is relatively stable. Look for opportunities to save.',
        ],
      },

      Shopping: {
        increasing: [
          'Review non-essential purchases before buying.',
          'Set a monthly shopping budget.',
        ],
        decreasing: [
          'Your shopping expenses have decreased. Maintain this habit.',
          'Consider saving some of the money you have freed up.',
        ],
        stable: [
          'Review recurring purchases and identify unnecessary expenses.',
        ],
      },

      Entertainment: {
        increasing: [
          'Review subscriptions and entertainment expenses.',
          'Set a monthly entertainment budget.',
        ],
        decreasing: [
          'Your entertainment expenses have decreased.',
          'Continue prioritizing the activities that matter most to you.',
        ],
        stable: [
          'Your entertainment spending is relatively stable.',
        ],
      },

      Transportation: {
        increasing: [
          'Review fuel, public transport, and ride-sharing expenses.',
          'Compare transportation options to reduce costs.',
        ],
        decreasing: [
          'Your transportation expenses have decreased.',
          'Continue using cost-effective travel options.',
        ],
        stable: [
          'Your transportation spending is relatively stable.',
        ],
      },
    };

    const categoryRecommendations = recommendations[category];

    if (categoryRecommendations) {
      return categoryRecommendations[trend];
    }

    if (trend === 'increasing') {
      return [
        `Review your ${category} expenses for possible savings.`,
        `Consider setting a monthly budget for ${category}.`,
      ];
    }

    if (trend === 'decreasing') {
      return [
        `Your ${category} spending has decreased. Continue tracking it.`,
      ];
    }

    return [
      `Track your ${category} spending and review it against your budget.`,
    ];
  }

  private generateRecommendations(
    patterns: SpendingPattern[]
  ): string[] {
    const recommendations: string[] = [];

    for (const pattern of patterns) {
      if (
        pattern.trend === 'increasing' &&
        pattern.averageSpending > 5000
      ) {
        recommendations.push(
          `Your ${pattern.category} spending is increasing. Review this category against your budget.`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Review your monthly expenses and identify opportunities to save.',
        'Track spending regularly to understand your financial habits.',
        'Consider setting realistic budgets for your main spending categories.',
        'Build an emergency fund according to your financial circumstances.',
        'Review recurring payments and cancel services you no longer need.'
      );
    }

    return recommendations.slice(0, 5);
  }

  private async findSavingsOpportunities(
    userId: string
  ): Promise<SpendingInsights['savingsOpportunities']> {
    try {
      const currentMonth = getMonthStart(new Date());

      // Examine the current month and previous two months.
      const startDate = shiftMonth(currentMonth, -2);

      const subscriptions = await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            date: { $gte: startDate },
            type: 'debit',
            amount: { $gt: 0, $lte: 2000 },
            merchant: {
              $exists: true,
              $type: 'string',
              $nin: ['', null],
            },
          },
        },
        {
          $group: {
            _id: {
              merchant: '$merchant',
              year: { $year: '$date' },
              month: { $month: '$date' },
            },
            monthlyTotal: { $sum: '$amount' },
          },
        },
        {
          $group: {
            _id: '$_id.merchant',
            activeMonths: { $sum: 1 },
            averageMonthlyAmount: {
              $avg: '$monthlyTotal',
            },
          },
        },
        {
          // Require activity in at least two distinct months.
          $match: {
            activeMonths: { $gte: 2 },
          },
        },
      ]);

      return subscriptions.map((item) => ({
        type: 'subscription' as const,
        merchant: item._id,
        potentialSavings:
          Math.round(item.averageMonthlyAmount * 12 * 100) / 100,
        description:
          `Review recurring payments to ${item._id} and cancel the service if it is no longer needed.`,
        priority: 'medium' as const,
      }));
    } catch (error) {
      console.error('Find savings opportunities error:', error);
      return [];
    }
  }

  private async predictNextMonthExpenses(
    userId: string
  ): Promise<number> {
    try {
      const currentMonth = getMonthStart(new Date());

      // Use the three most recent completed calendar months.
      const endDate = currentMonth;
      const startDate = shiftMonth(
        currentMonth,
        -MONTHS_TO_PREDICT
      );

      const monthlyTotals = (await Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: 'debit',
            date: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },
        {
          $group: {
            _id: {
              month: { $month: '$date' },
              year: { $year: '$date' },
            },
            total: { $sum: '$amount' },
          },
        },
      ])) as Array<{
        _id: { month: number; year: number };
        total: number;
      }>;

      const totalsByMonth = new Map<string, number>();

      for (const item of monthlyTotals) {
        totalsByMonth.set(
          monthKey(item._id.year, item._id.month),
          item.total
        );
      }

      const completedMonths: number[] = [];

      for (let i = 0; i < MONTHS_TO_PREDICT; i++) {
        const date = shiftMonth(startDate, i);

        completedMonths.push(
          totalsByMonth.get(
            monthKey(date.getFullYear(), date.getMonth() + 1)
          ) || 0
        );
      }

      const average =
        completedMonths.reduce((sum, amount) => sum + amount, 0) /
        MONTHS_TO_PREDICT;

      // Simple baseline estimate, not a statistical forecast.
      return Math.round(average * 100) / 100;
    } catch (error) {
      console.error('Predict expenses error:', error);
      return 0;
    }
  }
}

export const aiService = new AIService();
