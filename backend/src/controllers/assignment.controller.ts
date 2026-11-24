import type { Request, Response } from "express";
import {prisma} from '../config/database'
import { handlePrismaError } from "../utils/handleDBError";
import { createAssignmentSchema , assignmentIdSchema, updateAssignmentSchema} from "../validators/assignment.validator";

const createAssignment = async (request: Request, response: Response) => {
    try {
        const userRole = request.user.role;
        
        if (userRole !== "ADMIN") {
            return response.status(403).json({
                success: false,
                message: "Only professors can create assignments",
            });
        }
        const { error, value } = createAssignmentSchema.validate(request.body);
        
        if (error) {
            return response.status(400).json({
                success: false,
                message: error.details[0].message,
                path: error.details[0].path,
            });
        }
        const userId = request.user.id;
        const {
            title,
            description,
            dueDate,
            oneDriveUrl,
            groupIds,
        } = value;

        const groups = await prisma.group.findMany({
            where:
                groupIds === "all"
                    ? {}
                    : {
                        id: {
                            in: groupIds,
                        },
                    },
            select: {
                id: true,
            },
        });

        if (groupIds !== "all" && groups.length !== groupIds.length) {
            return response.status(400).json({
                success: false,
                message: "One or more selected groups do not exist",
            });
        }

        const assignment = await prisma.assignment.create({
            data: {
                title,
                description,
                dueDate,
                oneDriveUrl,
                createdById: userId,

                groups: {
                    create: groups.map((group) => ({
                        group: {
                            connect: {
                                id: group.id,
                            },
                        },
                    })),
                },
            },
            include: {
                groups: {
                    include: {
                        group: true,
                    },
                },
            },
        });

        return response.status(201).json({
            success: true,
            message: "Assignment created successfully",
            assignment,
        });

    } catch (error) {
        handlePrismaError(error, response);
    }
};

const editAssignment = async (request: Request, response: Response) => {
    try {
        if (request.user.role !== "ADMIN") {
            return response.status(403).json({
                success: false,
                message: "Only professors can edit assignments",
            });
        }

        const { error: paramsError } = assignmentIdSchema.validate(
            request.params
        );

        if (paramsError) {
            return response.status(400).json({
                success: false,
                message: paramsError.details[0].message,
                path: paramsError.details[0].path,
            });
        }

        const { error, value } = updateAssignmentSchema.validate(
            request.body,
            { abortEarly: false }
        );

        if (error) {
            return response.status(400).json({
                success: false,
                message: error.details[0].message,
                path: error.details[0].path,
            });
        }

        const { assignmentId } = request.params;
        if(typeof assignmentId !== 'string'){
            return response.status(400).json({
                success: false,
                message: "Invalid assignment ID. Assignment ID must be a single string.",
            });
        }
        const existingAssignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
        });

        if (!existingAssignment) {
            return response.status(404).json({
                success: false,
                message: "Assignment not found",
            });
        }

        const { groupIds, ...assignmentData } = value;

        let groupRelations = undefined;

        if (groupIds !== undefined) {
            const groups = await prisma.group.findMany({
                where: groupIds === "all"
                    ? {}
                    : { id: { in: groupIds } },
                select: { id: true },
            });

            if (
                groupIds !== "all" &&
                groups.length !== groupIds.length
            ) {
                return response.status(400).json({
                    success: false,
                    message: "One or more selected groups do not exist",
                });
            }

            groupRelations = {
                deleteMany: {},
                create: groups.map((group) => ({
                    group: {
                        connect: { id: group.id },
                    },
                })),
            };
        }

        const assignment = await prisma.assignment.update({
            where: { id: assignmentId },
            data: {
                ...assignmentData,
                ...(groupRelations && {
                    groups: groupRelations,
                }),
            },
            include: {
                groups: {
                    include: {
                        group: true,
                    },
                },
            },
        });

        return response.status(200).json({
            success: true,
            message: "Assignment updated successfully",
            assignment,
        });

    } catch (error) {
        handlePrismaError(error, response);
    }
};

const getAssignmentById = async (request: Request, response: Response) => {
    try {
        const { error } = assignmentIdSchema.validate(request.params);

        if (error) {
            return response.status(400).json({
                success: false,
                message: error.details[0].message,
                path: error.details[0].path,
            });
        }

        const { assignmentId } = request.params;
        if(typeof assignmentId !== 'string'){
            return response.status(400).json({
                success: false,
                message: "Invalid assignment ID. Assignment ID must be a single string.",
            });
        }

        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: {
                groups: {
                    include: {
                        group: {
                            select: {
                                id: true,
                                name: true,
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
                submissions: true,
            },
        });

        if (!assignment) {
            return response.status(404).json({
                success: false,
                message: "Assignment not found",
            });
        }

        if (request.user.role !== "ADMIN") {
            const membership = await prisma.groupMember.findUnique({
                where: { userId: request.user.id },
                select: { groupId: true },
            });

            const isAssigned = membership && assignment.groups.some(
                (item) => item.groupId === membership.groupId
            );

            if (!isAssigned) {
                return response.status(403).json({
                    success: false,
                    message: "You are not authorized to access this assignment",
                });
            }
        }

        return response.status(200).json({
            success: true,
            message: "Assignment fetched successfully",
            assignment,
        });

    } catch (error) {
        handlePrismaError(error, response);
    }
};

const getAllAssignment = async (request: Request, response: Response) => {
    try {
        const userId = request.user.id;
        const userRole = request.user.role;

        let where = {};

        if (userRole !== "ADMIN") {
            const membership = await prisma.groupMember.findUnique({
                where: { userId },
                select: { groupId: true },
            });

            if (!membership) {
                return response.status(200).json({
                    success: true,
                    message: "No group found. No assignments available.",
                    assignments: [],
                });
            }

            where = {
                groups: {
                    some: {
                        groupId: membership.groupId,
                    },
                },
            };
        }

        const assignments = await prisma.assignment.findMany({
            where,
            include: {
                groups: {
                    include: {
                        group: {
                            select: {
                                id: true,
                                name: true,
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
            orderBy: {
                dueDate: "asc",
            },
        });

        return response.status(200).json({
            success: true,
            message: "Assignments fetched successfully",
            assignments,
        });

    } catch (error) {
        handlePrismaError(error, response);
    }
};


export{createAssignment, editAssignment, getAssignmentById, getAllAssignment}