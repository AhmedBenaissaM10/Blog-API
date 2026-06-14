import jwt from "jsonwebtoken";
import {env }from "../config/env";

export const createAccessToken = (id: string, role: string, email: string): string => {
    
    return jwt.sign({ id, email, role }, env.ACCESS_TOKEN, {
        expiresIn: "15m"
    });
};
export const createRefreshToken =  (id: string, role: string,email: string, rememberMe : boolean = false): string => {    
    return jwt.sign({ id, email ,role }, env.REFRESH_TOKEN, {
        expiresIn: rememberMe ? "30d" :"7d"
    });
}