import type { Request, Response } from "express";
import { loginSchema, signupSchema } from "../validators/auth.validator";
import { prisma } from "../config/database";
import { comparePassword, hashPassword } from "../utils/password";
import { generateAccessToken } from "../utils/jwt";
import { handlePrismaError } from "../utils/handleDBError";


const login = async(request: Request, response:Response) => {
    try {
        const {error, value} = loginSchema.validate(request.body)

        if(error){
            console.error("Validation error")
            return response.status(400).json({
                success: false,
                message: error.details[0].message,
                path: error.details[0].path,
            });
        }

        const {email , password} = value

        const user = await prisma.user.findUnique({
            where: {
                email: email.toLowerCase()
            }
        })

        if(!user){
            return response.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const isPasswordValid = await comparePassword(password, user.password)
        if(!isPasswordValid){
            return response.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = generateAccessToken(user.id, user.tokenVersion)
        
        response.cookie("accessToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000, 
            path: "/",
        });

        return response.status(200).json({
        success: true,
        message: "Login successful",
        });

    } catch (error) {
        handlePrismaError(error , response)
    }
}

const signUp = async(request: Request, response:Response) => {
    try {
        const {error, value} = signupSchema.validate(request.body)

        if(error){
            console.error("Validation error")
            return response.status(400).json({
                success: false,
                message: error.details[0].message,
                path: error.details[0].path,
            });
        }

        const {email , password, name} = value
        const normalizedEmail  = email.toLowerCase()

        const existingUser = await prisma.user.findUnique({
            where: {
                email : normalizedEmail
            }
        })

        if (existingUser) {
            return response.status(409).json({
                success: false,
                message: "Email already registered",
            });
        }

        const hashedPassword = await hashPassword(password)
        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                name,
                password: hashedPassword,
            },
        });

        
        const token = generateAccessToken(user.id, user.tokenVersion);
        response.cookie("accessToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000, 
            path: "/",
        });

        return response.status(201).json({
            success: true,
            message: "Signup successful",
        });

    } catch (error) {
        handlePrismaError(error , response)
    }
}

const signOut = async(request: Request, response:Response) => {
    try {
        await prisma.user.update({
            where: {
                id: request.user.id,
            },
            data: {
                tokenVersion: {
                increment: 1,
                },
        },
    });

    response.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response.status(200).json({
      success: true,
      message: "Sign out successful",
    });
    } catch (error) {
        handlePrismaError(error, response)
    }
}

const getMe = async (request: Request, response: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: request.user.id,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        name: true,
        role: true
      },
    });

    if (!user) {
      return response.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return response.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: {
        user,
      },
    });

  } catch (error) {
    console.error("GetMe error:", error);

    return response.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export {login, signUp, signOut, getMe}