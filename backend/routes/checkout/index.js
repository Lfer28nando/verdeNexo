import { Router } from "express";
import checkoutRoutes from "./checkout.routes.js";

const router = Router();

// Usar todas las rutas de checkout
router.use("/", checkoutRoutes);

export default router;
