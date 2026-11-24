import { Router } from "express";
import { createGroup, addMember, getGroup, getGroupDetails, getMyGroup, getAllGroups } from "../controllers/group.controller";
import authMiddleWare from "../middleware/auth.middleware";

const groupRoute = Router()

groupRoute.post("/create",authMiddleWare,createGroup);
groupRoute.get("/me", authMiddleWare, getMyGroup); 
groupRoute.get("/all", authMiddleWare, getAllGroups); 
groupRoute.post("/:groupId/members", authMiddleWare, addMember)
groupRoute.get("/:groupId", authMiddleWare, getGroup)
groupRoute.get("/details/:groupId", authMiddleWare, getGroupDetails)

export default groupRoute