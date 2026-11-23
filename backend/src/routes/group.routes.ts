import { Router } from "express";
import { createGroup, addMember, getGroup, getGroupDetails } from "../controllers/group.controller";
import authMiddleWare from "../middleware/auth.middleware";

const groupRoute = Router()

groupRoute.post("/create",authMiddleWare,createGroup);
groupRoute.post("/:groupId/members", authMiddleWare, addMember)
groupRoute.get("/:groupId", authMiddleWare, getGroup)
groupRoute.get("/details/:groupId", authMiddleWare, getGroupDetails)

export default groupRoute