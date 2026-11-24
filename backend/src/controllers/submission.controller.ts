import type { Request, Response } from "express";
import { prisma } from "../config/database";
import { confirmSubmissionSchema } from "../validators/submission.validator";
import { handlePrismaError } from "../utils/handleDBError";

const confirmSubmission = async (request: Request,response: Response ) => {
  try {
    const { error, value } = confirmSubmissionSchema.validate(request.body);

    if (error) {
      return response.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { assignmentId } = value;
    const userId = request.user.id;

    if (request.user.role !== "STUDENT") {
      return response.status(403).json({
        success: false,
        message: "Only students can confirm submissions",
      });
    }

    const membership = await prisma.groupMember.findUnique({
      where: { userId },
      select: { groupId: true },
    });

    if (!membership) {
      return response.status(404).json({
        success: false,
        message: "You do not belong to any group",
      });
    }

    const assignmentGroup = await prisma.assignmentGroup.findUnique({
      where: {
        assignmentId_groupId: {
          assignmentId,
          groupId: membership.groupId,
        },
      },
    });

    if (!assignmentGroup) {
      return response.status(404).json({
        success: false,
        message: "Assignment not found for your group",
      });
    }

    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_groupId: {
          assignmentId,
          groupId: membership.groupId,
        },
      },
      create: {
        assignmentId,
        groupId: membership.groupId,
        status: "SUBMITTED",
        confirmedById: userId,
        confirmedAt: new Date(),
      },
      update: {
        status: "SUBMITTED",
        confirmedById: userId,
        confirmedAt: new Date(),
      },
    });

    return response.status(200).json({
      success: true,
      message: "Submission confirmed successfully",
      data: { submission },
    });
  } catch (error) {
        handlePrismaError(error , response)
  }
};

const getAssignmentSubmissions = async (request: Request, response: Response) => {
  try {
    const { error, value } = confirmSubmissionSchema.validate(request.params)
    if (error) {
      return response.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }

    const { assignmentId } = value;
    const userId = request.user.id;
    const userRole = request.user.role;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        groups: {
          include: {
            group: {
              include: {
                submissions: {
                  where: { assignmentId },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return response.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    let groups = assignment.groups;

    if (userRole !== "ADMIN") {
      const membership = await prisma.groupMember.findUnique({
        where: { userId },
        select: { groupId: true },
      });

      if (!membership ||!groups.some((item) => item.groupId === membership.groupId) ) {
        return response.status(403).json({
          success: false,
          message: "You are not authorized to view this assignment",
        });
      }

      groups = groups.filter(
        (item) => item.groupId === membership.groupId
      );
    }

    const submissions = groups.map(({ group }) => ({
      groupId: group.id,
      groupName: group.name,
      submission: group.submissions[0] ?? {
        assignmentId,
        groupId: group.id,
        status: "PENDING",
        confirmedById: null,
        confirmedAt: null,
      },
    }));

    return response.status(200).json({
      success: true,
      message: "Assignment submission status fetched successfully",
      data: {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          dueDate: assignment.dueDate,
        },
        submissions,
      },
    });
  } catch (error) {
    handlePrismaError(error, response)
  }
};

const getGroupSubmissions = async (request: Request, response: Response) => {
  try {
    const { error, value } = confirmSubmissionSchema.validate(request.params)

    if (error) {
      return response.status(400).json({
        success: false,
        message: "Invalid group ID",
      });
    }

    const { groupId } = value;
    const userId = request.user.id;
    const userRole = request.user.role;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          select: { userId: true },
        },
        assignments: {
          include: {
            assignment: {
              include: {
                submissions: {
                  where: { groupId },
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

    if (userRole !== "ADMIN" &&!group.members.some((member) => member.userId === userId)) {
      return response.status(403).json({
        success: false,
        message: "You are not authorized to view this group's submissions",
      });
    }

    const assignments = group.assignments.map(({ assignment }) => ({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate,
      oneDriveUrl: assignment.oneDriveUrl,
      submission: assignment.submissions[0] ?? {
        assignmentId: assignment.id,
        groupId,
        status: "PENDING",
        confirmedById: null,
        confirmedAt: null,
      },
    }));

    return response.status(200).json({
      success: true,
      message: "Group submission status fetched successfully",
      data: {
        group: {
          id: group.id,
          name: group.name,
        },
        assignments,
      },
    });
  } catch (error) {
    handlePrismaError(error, response)
  }
};


export {confirmSubmission, getAssignmentSubmissions, getGroupSubmissions}