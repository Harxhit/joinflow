import jwt from "jsonwebtoken";
import config from "../config";


const generateAccessToken = (userId: string, tokenVersion: number) => {
  return jwt.sign({ userId, tokenVersion }, config.jwtSecret, { expiresIn: config.jwtExpiry });
};

const verifyAccessToken = (token:string) => {
  return jwt.verify(token, config.jwtSecret)
}

export {generateAccessToken, verifyAccessToken}