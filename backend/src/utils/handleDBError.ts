
import { Prisma } from "../generated/prisma/client";
import type { Response } from "express";

export const handlePrismaError = (error: unknown, response: Response) => {
    console.error("Database operation failed:", (error as Error).name);

    if (
        error instanceof Prisma.PrismaClientKnownRequestError
    ) {
        switch (error.code) {
            case "P2002":
                return response.status(409).json({
                    success: false,
                    message: "Resource already exists",
                });

            case "P2025":
                return response.status(404).json({
                    success: false,
                    message: "Requested resource not found",
                });

            default:
                console.error("Prisma error code:", error.code);
                console.error("Prisma error message:", error.message);
        }
    }

    return response.status(500).json({
        success: false,
        message: "Internal server error",
    });
};
