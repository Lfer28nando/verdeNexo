import { Router } from "express";
import loginRoutes from "./login.routes.js";
import registroRoutes from "./registro.routes.js";
import passwordRoutes from "./password.routes.js";
import profileRoutes from "./profile.routes.js";
import adminRoutes from "./admin.routes.js";
import twofaRoutes from "./twofa.routes.js";

const router = Router();

// Rutas de autenticación
router.use("/login", loginRoutes);
router.use("/registro", registroRoutes);
router.use("/password", passwordRoutes);
router.use("/profile", profileRoutes);
router.use("/admin", adminRoutes);
router.use("/2fa", twofaRoutes);

export default router;
