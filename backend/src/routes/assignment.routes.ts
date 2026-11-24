import { Router } from "express";
import authMiddleWare from "../middleware/auth.middleware";

import {
    createAssignment,
    getAllAssignment,
    getAssignmentById,
    editAssignment,
} from "../controllers/assignment.controller";

const assignmentRoute = Router();

assignmentRoute.post("/create",authMiddleWare,createAssignment);

assignmentRoute.get("/all",authMiddleWare,getAllAssignment);

assignmentRoute.get("/:assignmentId",authMiddleWare, getAssignmentById);

assignmentRoute.patch("/:assignmentId",authMiddleWare,editAssignment);

export default assignmentRoute;