import jwt from "jsonwebtoken";
import {env }from "../config/env";

export const createToken = (id: string, role: string): string => {
    
    return jwt.sign({ id, role }, env.JWT_SECRET, {
        expiresIn: "7d"
    });
};