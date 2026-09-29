import nodemailer from 'nodemailer';
import { env } from '@config/env';
import AppError from '@errors/AppError';
import logger from '@utils/logger';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASSWORD,
  },
});

export const sendOTPEmail = async (to: string, code: string, subject: string) => {
  logger.info('Sending OTP email to', to);
  try {
    await transporter.sendMail({
      from: `My App <${env.EMAIL_USER}>`,
      to,
      subject,
      html: `
        <div
          style="
            font-family: Arial;
            max-width: 600px;
            margin: auto;
            padding: 20px;
            background: #ffffff;
            border: 1px solid #ddd;" >
          <h2> Confirm this email address </h2>
          <p> Hi,</p>
          <p>To help us confirm your identity, we need to verify your email address.</p>
          <div
            style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 5px;
              margin: 30px 0;
              color: #1877f2;
            "> ${code}</div>
          <p>Don't share this code with anyone.</p>
          <hr />
          <h3>If someone asks for this code</h3>
          <p> Don't share this code with anyone, even if they claim to work for support.</p>
          <h3>Didn't expect this?</h3>
          <p> If you didn't request this, you can safely ignore this email.</p>
          <br />
          <p>Thanks,<br />My App Security</p>
      </div>`,
    });
  } catch (error) {
    logger.error('Error sending OTP email:', error);
    throw new AppError('Failed to send OTP email', 500);
  }
};
