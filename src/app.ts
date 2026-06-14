import express from 'express'
import cors from 'cors'
import errorHandler from './middlewares/errorHandler'
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import logger from './utils/logger'
import AppError from './errors/AppError';
import { prisma } from './lib/prisma';
import authRoute from './features/auth/authRoute'
const app = express()

app.use(cors())
app.use(cookieParser())
app.use(express.json())
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    })
  );
}


app.use("/auth",authRoute)

app.use((_req: express.Request,_res: express.Response, next: express.NextFunction)=> next(new AppError("Error 404 - Page Not Found",404)))
app.use(errorHandler)

async function testDB() {
  try {
    await prisma.$connect()
    logger.info("Prisma connected to database")
  } catch (err) {
    logger.error("Prisma connection failed", { error: err })
    process.exit(1)
  }
}
testDB()
export default app;