import { Response } from 'express';
import { env } from '@config/env';

export const setCookie = (res: Response, name: string, value: string, maxAge: number) => {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    maxAge,
  });
};
export const delCookie = (res: Response, name: string) => {
  res.clearCookie(name, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
  });
};

const SEVEN_DAYS = 60 * 60 * 1000 * 24 * 7;
const FIFTEEN_MINUTES = 15 * 60 * 1000;
export const setAuthCookies = (res: Response, accessToken: string, refreshToken?: string) => {
  setCookie(res, 'accessToken', accessToken, FIFTEEN_MINUTES);
  if (refreshToken) {
    setCookie(res, 'refreshToken', refreshToken, SEVEN_DAYS);
  }
};
export const clearAuthCookies = (res: Response) => {
  delCookie(res, 'accessToken');
  delCookie(res, 'refreshToken');
};
