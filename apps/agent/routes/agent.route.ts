import {Router} from "express";
import { agentController } from "../controllers/agent.controller";


const router = Router();


router.post("/chat" , agentController)

export default router;