import { createAccessToken, createRefreshToken } from '../../utils/authUtils';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {notFound, badRequest, unauthorized, forbidden} from '../../errors/ErrorIndex';
import catchAsync from '../../utils/catchAsync';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env'
import jwt, { JwtPayload } from 'jsonwebtoken';
import logger from '../../utils/logger';


// POST /signup
export const signup = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password } = req.body || {};
    const existingUser = await prisma.user.findUnique({ where: { email: email }})
    if (existingUser) return next(badRequest("Email already in use"));
    const hashedPassword = await bcrypt.hash(password, 10);
    // add Transaction later
    const newUser = await prisma.user.create(
        {data:{
            email, 
            name, 
            password: hashedPassword,
            
        }})
    const refreshToken = createRefreshToken(newUser.id,newUser.role, newUser.email)
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
    await prisma.refreshToken.create({
        data:{
            tokenHash ,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
            userId: newUser.id,
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        }
    })
    const accessToken = createAccessToken(newUser.id, newUser.role, newUser.email);
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: env.NODE_ENV === "production",
        maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: env.NODE_ENV === "production",
        maxAge: 60 * 60 * 1000 * 24 * 7,
    });
    logger.info(`New user created : ${newUser.email}`)
    res.status(201).json({ success: true, user: { 
        id : newUser.id,
        email: newUser.email,
        role: newUser.role
    } });
})

// POST /login
export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, rememberMe = false } = req.body || {};

    const user = await prisma.user.findUnique({where:{email}})

    if (!user) return next(badRequest("Invalid credentials"));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(badRequest("Invalid credentials"));

    const refreshToken = createRefreshToken(user.id, user.role, user.email, rememberMe)
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
    await prisma.refreshToken.create({
        data:{
            tokenHash ,
            expiresAt: rememberMe? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) ,
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        }
    })
    const accessToken = createAccessToken(user.id, user.role, user.email);

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: env.NODE_ENV === "production",
        maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: env.NODE_ENV === "production",
        maxAge: rememberMe ? 60 * 60 * 1000 * 24 * 30 : 60 * 60 * 1000 * 24 * 7,
    });
    logger.info(`${user.email} Logged in`)
    res.status(200).json({ success: true, user: { 
        id : user.id,
        email: user.email,
        role: user.role
    } });
}
);

// POST /refresh
export const refresh = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken: string | undefined = req.cookies.refreshToken;
    if(!refreshToken) return next(unauthorized("No token provided"));
    const refreshDecoded = jwt.verify(refreshToken, env.REFRESH_TOKEN) as JwtPayload;
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
    const token = await prisma.refreshToken.findUnique({where: {tokenHash}})
    if(!token) return next(unauthorized("Refresh token not found"));
    if(token.expiresAt < new Date( Date.now())) return next(unauthorized("Refresh Token expired"))
        const accessToken = createAccessToken(refreshDecoded.id, refreshDecoded.role, refreshDecoded.email);
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "strict",
        secure: env.NODE_ENV === "production",
        maxAge: 15 * 60 * 1000,
    });
    logger.info(`${refreshDecoded.email} created a new access token`)
    res.status(200).json({success: true, message: "Accces Token created"})
})

// POST /logout
export const logout = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
    const refreshToken: string | undefined = req.cookies.refreshToken;
    if(refreshToken){
        const tokenHash = crypto.createHash("sha256").update(req.cookies.refreshToken).digest("hex")
        await prisma.refreshToken.deleteMany({where: { tokenHash }})
    }
    res.clearCookie("accessToken",{
        httpOnly: true,
        sameSite: "strict",
        secure: env.NODE_ENV === "production",
    });
    res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: "strict",
        secure: env.NODE_ENV === "production",
        
    });
    logger.info(`${req.user?.email ?? "Unknown user"} logged out`)
    res.status(200).json({ success: true, message: "Logged out" });
})



// GET /users/:id
export const getUserProfile = catchAsync( async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    if (typeof id !== 'string') return next(badRequest("Invalid id"));
    
    const user = await prisma.user.findUnique({
        where:{id : id},
        include:{
            posts: {
                include:{
                    comments: true,
                }
            }
        } 
    })

    if (!user) return next(notFound("User not found"));
    const { password: _, ...safeUser } = user;
    res.status(200).json({ success: true, user: safeUser });
}
)

// PATCH /users/:id
export const updateUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        return next(badRequest("Invalid id"));
    }

    if (req.user?.id !== id && req.user?.role !== "admin") {
        return next(forbidden("You are not authorized to update this user"));
    }

    const { name, password } = req.body || {};

    const data: { name?: string; password?: string } = {};
    if (name) data.name = name;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
        where: { id },
        data
    });

    const { password: _, ...safeUser } = user;
    res.status(200).json({ success: true, message: "User updated", user: safeUser });
});


// DELETE /users/:id
export const deleteUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    if (typeof id !== 'string') {
        return next(badRequest("Invalid credentials"));
    }      
    const index = await prisma.user.delete({
        where:{
            id: id
        }
    })
    res.status(204).json({ success: true, message: "User deleted" });
}
);
// GET /users
export const getAllUsers = catchAsync(async (_req: Request, res: Response) => {
    const safeUsers = await prisma.user.findMany({
        select:{
            id: true,
            email: true,
            name: true,
        }
    })
    res.status(200).json({ success: true, users: safeUsers });
});