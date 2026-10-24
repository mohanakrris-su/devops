import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dataMode: (process.env.DATA_MODE || 'mock') as 'mock' | 'mongodb',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/costwatch',

  anomaly: {
    percentageThreshold: parseFloat(process.env.ANOMALY_PERCENTAGE_THRESHOLD || '50'),
    absoluteThreshold: parseFloat(process.env.ANOMALY_ABSOLUTE_THRESHOLD || '50'),
    historyDays: parseInt(process.env.ANOMALY_HISTORY_DAYS || '14', 10),
  },

  alert: {
    dedupWindowHours: parseInt(process.env.ALERT_DEDUP_WINDOW_HOURS || '24', 10),
  },
} as const;
