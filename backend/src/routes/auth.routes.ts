import { Router } from "express";
import { register, login, getMe, logout } from "../controllers/auth.controller";
import { protect } from "../middleware/auth";
import { registerRules, loginRules, validate } from "../middleware/validators";

const router = Router();

router.post("/register", registerRules, validate, register);
router.post("/login",    loginRules,    validate, login);
router.get( "/me",       protect,               getMe);
router.post("/logout",   protect,               logout);

export default router;