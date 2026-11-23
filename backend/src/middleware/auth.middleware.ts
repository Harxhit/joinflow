import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../config/database";
import { handlePrismaError } from "../utils/handleDBError";

const authMiddleWare = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  try {
    const token = request.cookies?.accessToken;

    if (!token) {
      return response.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const decoded = verifyAccessToken(token) as {
      userId: string;
      tokenVersion: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        tokenVersion: true,
      },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return response.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    request.user = {id: user.id,};

    return next();

  } catch (error) {
    handlePrismaError(error ,response)
  }
};

export default authMiddleWare;