import { Router } from "express";
import authMiddleWare from "../middleware/auth.middleware";

import {
  getAnalyticsOverview,
  getGroupAnalytics,
  getStudentAnalytics,
  getGroupProgress
} from "../controllers/anaylytics.controller";

const analyticsRoute = Router();

analyticsRoute.get("/overview", authMiddleWare, getAnalyticsOverview);
analyticsRoute.get("/groups", authMiddleWare, getGroupAnalytics);
analyticsRoute.get("/students", authMiddleWare, getStudentAnalytics);
analyticsRoute.get("/group/:groupId", authMiddleWare, getGroupProgress);

export default analyticsRoute;