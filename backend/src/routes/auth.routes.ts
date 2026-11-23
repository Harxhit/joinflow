import { Router } from "express";
import { getMe, login, signOut, signUp } from "../controllers/auth.controller";
import authMiddleWare from "../middleware/auth.middleware";

const authRoute = Router()

authRoute.route('/login').post(login)
authRoute.route('/signup').post(signUp)
authRoute.route('/logout').patch(authMiddleWare,signOut)
authRoute.route('/me').get(authMiddleWare,getMe)

export default authRoute