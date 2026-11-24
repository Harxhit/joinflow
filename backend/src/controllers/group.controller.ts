import type { Request, Response } from "express";
import { prisma } from "../config/database";
import { handlePrismaError } from "../utils/handleDBError";
import { createGroupSchema, addMemberSchema } from "../validators/group.validator";

const createGroup = async (request: Request, response: Response) => {
    try {
        const { error, value } = createGroupSchema.validate(request.body);

        if (error) {
            console.error("Validation error");
            return response.status(400).json({
                success: false,
                message: error.details[0].message,
                path: error.details[0].path,
            });
        }

        const { name } = value;
        const creatorUserId = request.user.id;

        const group = await prisma.$transaction(async (tx) => {
            const newGroup = await tx.group.create({
                data: {
                    name,
                    createdById: creatorUserId,
                },
            });

            await tx.groupMember.create({
                data: {
                    userId: creatorUserId,
                    groupId: newGroup.id,
                },
            });

            return newGroup;
        });

        return response.status(200).json({
            success: true,
            message: "Group created successful",
            group,
        });
    } catch (error) {
        handlePrismaError(error, response);
    }
};

const addMember = async (request: Request, response: Response) => {
    try {
        const { error, value } = addMemberSchema.validate(request.body);

        if (error) {
            return response.status(400).json({
                success: false,
                message: error.details[0].message,
                path: error.details[0].path,
            });
        }

        const { email, studentId } = value;
        const { groupId } = request.params;

        if (typeof groupId !== "string") {
            return response.status(400).json({
                success: false,
                message: "Invalid group ID. Group ID must be a single string.",
            });
        }

        // Only a member of this group (or an admin) may add people to it
        if (request.user.role !== "ADMIN") {
            const requester = await prisma.groupMember.findUnique({
                where: { userId: request.user.id },
                select: { groupId: true },
            });

            if (!requester || requester.groupId !== groupId) {
                return response.status(403).json({
                    success: false,
                    message: "You can only add members to your own group",
                });
            }
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(email ? [{ email }] : []),
                    ...(studentId ? [{ studentId }] : []),
                ],
                role: "STUDENT",
            },
        });

        if (!user) {
            return response.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        const existingMembership = await prisma.groupMember.findUnique({
            where: { userId: user.id },
        });

        if (existingMembership) {
            return response.status(409).json({
                success: false,
                message: "Student already belongs to a group",
            });
        }

        const member = await prisma.groupMember.create({
            data: {
                userId: user.id,
                groupId,
            },
        });

        return response.status(201).json({
            success: true,
            message: "Member added successfully",
            member,
        });
    } catch (error) {
        handlePrismaError(error, response);
    }
};

// Admin only: every group with its member count, for the assignment forms
const getAllGroups = async (request: Request, response: Response) => {
    try {
        if (request.user.role !== "ADMIN") {
            return response.status(403).json({
                success: false,
                message: "Only admins can view all groups",
            });
        }

        const groups = await prisma.group.findMany({
            select: {
                id: true,
                name: true,
                _count: { select: { members: true } },
            },
            orderBy: { name: "asc" },
        });

        return response.status(200).json({
            success: true,
            message: "Groups fetched successfully",
            groups,
        });
    } catch (error) {
        handlePrismaError(error, response);
    }
};

const getGroup = async (request: Request, response: Response) => {
    try {
        const { groupId } = request.params;

        if (typeof groupId !== "string") {
            return response.status(400).json({
                success: false,
                message: "Invalid group ID. Group ID must be a single string.",
            });
        }

        const userId = request.user.id;
        const userRole = request.user.role;

        const group = await prisma.group.findUnique({
            where: {
                id: groupId,
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                studentId: true,
                            },
                        },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!group) {
            return response.status(404).json({
                success: false,
                message: "Group not found",
            });
        }

        if (userRole !== "ADMIN" && !group.members.some((member) => member.userId === userId)) {
            return response.status(403).json({
                success: false,
                message: "You are not authorized to access this group",
            });
        }

        return response.status(200).json({
            success: true,
            message: "Group fetched successfully",
            group,
        });
    } catch (error) {
        handlePrismaError(error, response);
    }
};

const getMyGroup = async (request: Request, response: Response) => {
    try {
        const membership = await prisma.groupMember.findUnique({
            where: { userId: request.user.id },
            select: { groupId: true },
        });

        if (!membership) {
            return response.status(200).json({
                success: true,
                message: "You are not in a group yet",
                group: null,
            });
        }

        const group = await prisma.group.findUnique({
            where: { id: membership.groupId },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, studentId: true },
                        },
                    },
                },
            },
        });

        return response.status(200).json({
            success: true,
            message: "Group fetched successfully",
            group,
        });
    } catch (error) {
        handlePrismaError(error, response);
    }
};

const getGroupDetails = async (request: Request, response: Response) => {
    try {
        const { groupId } = request.params;

        if (typeof groupId !== "string") {
            return response.status(400).json({
                success: false,
                message: "Invalid group ID. Group ID must be a single string.",
            });
        }

        const userId = request.user.id;
        const userRole = request.user.role;

        const group = await prisma.group.findUnique({
            where: {
                id: groupId,
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                studentId: true,
                            },
                        },
                    },
                },
                assignments: {
                    include: {
                        assignment: {
                            include: {
                                submissions: {
                                    where: {
                                        groupId,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!group) {
            return response.status(404).json({
                success: false,
                message: "Group not found",
            });
        }

        if (userRole !== "ADMIN" && !group.members.some((member) => member.userId === userId)) {
            return response.status(403).json({
                success: false,
                message: "You are not a member of this group",
            });
        }

        return response.status(200).json({
            success: true,
            message: "Group details fetched successfully",
            group,
        });
    } catch (error) {
        handlePrismaError(error, response);
    }
};

export { createGroup, addMember, getAllGroups, getGroup, getGroupDetails, getMyGroup };