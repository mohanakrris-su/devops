import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { config } from './utils/config';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  if (config.nodeEnv === 'development') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  }
  next();
});

// Routes
app.use('/api', routes);

// 404 and error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
