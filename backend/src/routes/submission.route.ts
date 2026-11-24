import { Router } from "express";
import authMiddleWare from "../middleware/auth.middleware";

import {
  confirmSubmission,
  getAssignmentSubmissions,
  getGroupSubmissions,
} from "../controllers/submission.controller";

const submissionRoute = Router();

submissionRoute.post("/confirm", authMiddleWare, confirmSubmission);

submissionRoute.get("/:assignmentId",authMiddleWare,getAssignmentSubmissions);

submissionRoute.get("/:groupId",authMiddleWare,getGroupSubmissions);

export default submissionRoute;