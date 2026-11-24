import type { Request, Response } from "express";
import { prisma } from "../config/database";
import { handlePrismaError } from "../utils/handleDBError";

const forbidden = (response: Response) =>
  response.status(403).json({
    success: false,
    message: "Only admins can access analytics",
  });

const rate = (done: number, total: number) =>
  total === 0 ? 0 : Number(((done / total) * 100).toFixed(2));

const getAnalyticsOverview = async (request: Request, response: Response) => {
  try {
    if (request.user.role !== "ADMIN") return forbidden(response);

    const [
      totalStudents,
      totalGroups,
      totalAssignments,
      totalAssigned,
      totalSubmitted,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.group.count(),
      prisma.assignment.count(),
      prisma.assignmentGroup.count(),
      prisma.submission.count({ where: { status: "SUBMITTED" } }),
    ]);

    return response.status(200).json({
      success: true,
      message: "Analytics overview fetched successfully",
      data: {
        totalStudents,
        totalGroups,
        totalAssignments,
        totalAssigned,
        totalSubmitted,
        pendingSubmissions: Math.max(totalAssigned - totalSubmitted, 0),
        completionRate: rate(totalSubmitted, totalAssigned),
      },
    });
  } catch (error) {
    handlePrismaError(error, response);
  }
};

const getGroupAnalytics = async (request: Request, response: Response) => {
  try {
    if (request.user.role !== "ADMIN") return forbidden(response);

    const groups = await prisma.group.findMany({
      include: {
        members: { select: { userId: true } },
        assignments: {
          include: {
            assignment: {
              include: {
                submissions: {
                  where: { status: "SUBMITTED" },
                  select: { groupId: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const groupAnalytics = groups.map((group) => {
      const totalAssignments = group.assignments.length;

      const submittedAssignments = group.assignments.filter(({ assignment }) =>
        assignment.submissions.some((s) => s.groupId === group.id)
      ).length;

      return {
        groupId: group.id,
        groupName: group.name,
        totalMembers: group.members.length,
        totalAssignments,
        submittedAssignments,
        pendingAssignments: totalAssignments - submittedAssignments,
        completionRate: rate(submittedAssignments, totalAssignments),
      };
    });

    return response.status(200).json({
      success: true,
      message: "Group analytics fetched successfully",
      data: { groups: groupAnalytics },
    });
  } catch (error) {
    handlePrismaError(error, response);
  }
};

const getStudentAnalytics = async (request: Request, response: Response) => {
  try {
    if (request.user.role !== "ADMIN") return forbidden(response);

    const groups = await prisma.group.findMany({
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, studentId: true },
            },
          },
        },
        assignments: {
          include: {
            assignment: {
              select: {
                id: true,
                title: true,
                dueDate: true,
                submissions: {
                  where: { status: "SUBMITTED" },
                  select: {
                    groupId: true,
                    status: true,
                    confirmedAt: true,
                    confirmedById: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const students = groups.flatMap((group) =>
      group.members.map(({ user }) => {
        const assignments = group.assignments.map(({ assignment }) => {
          // Only this group's submission counts for this student
          const submission = assignment.submissions.find(
            (s) => s.groupId === group.id
          );

          return {
            assignmentId: assignment.id,
            title: assignment.title,
            dueDate: assignment.dueDate,
            status: submission ? "SUBMITTED" : "PENDING",
            confirmedAt: submission?.confirmedAt ?? null,
            confirmedById: submission?.confirmedById ?? null,
          };
        });

        const totalAssignments = assignments.length;
        const submittedAssignments = assignments.filter(
          (a) => a.status === "SUBMITTED"
        ).length;

        return {
          studentId: user.id,
          name: user.name,
          email: user.email,
          collegeId: user.studentId,
          groupId: group.id,
          groupName: group.name,
          totalAssignments,
          submittedAssignments,
          pendingAssignments: totalAssignments - submittedAssignments,
          completionRate: rate(submittedAssignments, totalAssignments),
          assignments,
        };
      })
    );

    return response.status(200).json({
      success: true,
      message: "Student analytics fetched successfully",
      data: { students },
    });
  } catch (error) {
    handlePrismaError(error, response);
  }
};

const getGroupProgress = async (request: Request, response: Response) => {
  try {
    const { groupId } = request.params;
    if(typeof groupId !== 'string'){
      return response.status(400).json({
        success: false,
        message: "Invalid group ID. Group ID must be a single string.",
      });
    }
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        assignments: {
          include: {
            assignment: {
              select: {
                id: true,
                title: true,
                dueDate: true,
                submissions: {
                  where: { groupId, status: "SUBMITTED" },
                  select: { confirmedAt: true, confirmedById: true },
                },
              },
            },
          },
        },
      },
    });

    if (!group) {
      return response
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    const isAdmin = request.user.role === "ADMIN";
    const isMember = group.members.some((m) => m.userId === request.user.id);

    if (!isAdmin && !isMember) {
      return response
        .status(403)
        .json({ success: false, message: "You are not part of this group" });
    }

    const nameById = new Map(group.members.map((m) => [m.user.id, m.user.name]));
    const now = Date.now();

    const assignments = group.assignments
      .map(({ assignment }) => {
        const sub = assignment.submissions[0];
        const submitted = !!sub;

        return {
          assignmentId: assignment.id,
          title: assignment.title,
          dueDate: assignment.dueDate,
          status: submitted ? "SUBMITTED" : "PENDING",
          overdue: !submitted && new Date(assignment.dueDate).getTime() < now,
          confirmedAt: sub?.confirmedAt ?? null,
          confirmedById: sub?.confirmedById ?? null,
          confirmedBy: sub?.confirmedById
            ? nameById.get(sub.confirmedById) ?? null
            : null,
        };
      })
      .sort(
        (a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)
      );

    const total = assignments.length;
    const submitted = assignments.filter((a) => a.status === "SUBMITTED").length;
    const overdue = assignments.filter((a) => a.overdue).length;

    const members = group.members.map(({ user }) => {
      const confirmed = assignments.filter(
        (a) => a.confirmedById === user.id
      ).length;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        confirmedCount: confirmed,
        shareOfSubmitted: rate(confirmed, submitted),
      };
    });

    return response.status(200).json({
      success: true,
      message: "Group progress fetched successfully",
      data: {
        group: { id: group.id, name: group.name, totalMembers: members.length },
        summary: {
          total,
          submitted,
          pending: total - submitted,
          overdue,
          completionRate: rate(submitted, total),
        },
        assignments,
        members,
      },
    });
  } catch (error) {
    handlePrismaError(error, response);
  }
};

export { getGroupAnalytics, getAnalyticsOverview, getStudentAnalytics , getGroupProgress};