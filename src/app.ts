import { env } from '@config/env';
import errorHandler from '@middlewares/errorHandler';
import { notFound } from '@middlewares/notFound';
import { globalRateLimiter } from '@middlewares/rateLimiter';
import { requestId } from '@middlewares/requestId';
import logger from '@utils/logger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import adminRoutes from './features/admin/admin.route';
import authRoutes from './features/auth/auth.route';
import postRoutes from './features/posts/post.route';
import commentRoutes from './features/comments/comment.route';
import HealthRoutes from './routes/health.routes';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import passport from '@config/passport';
const app = express();

const swaggerDocument = YAML.load('./openapi.yml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(helmet());
app.set('trust proxy', 1);
app.use(compression());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestId as express.RequestHandler);
morgan.token('id', (req: express.Request) => req.id);
if (env.NODE_ENV === 'development') {
  app.use(morgan(':id :method :url :status :response-time ms - :res[content-length]'));
} else {
  app.use(
    morgan(
      ':id :remote-addr - :method :url :status :res[content-length] - :response-time ms ":referrer" ":user-agent"',
      {
        stream: { write: (msg) => logger.http(msg.trim()) },
        skip: () => env.NODE_ENV === 'test',
      }
    )
  );
}

// Health check endpoint
app.use('/health', HealthRoutes);
app.use(globalRateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/', commentRoutes);
app.use(notFound);
app.use(errorHandler as express.ErrorRequestHandler);

export default app;
