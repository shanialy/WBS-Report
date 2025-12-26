import { Router } from "express";
import { checkAuth } from "../middleware/checkAuth";
import { detailWBS, generateWBS, listWBS } from "../controllers/userController";

const router = Router();

router.post("/wbs", checkAuth, generateWBS);
router.get("/wbs", checkAuth, listWBS);
router.get("/wbs/:id", checkAuth, detailWBS);

export default router;
