import { Router } from "express";
import carritoRoutes from "./carrito.routes.js";

const router = Router();

// Usar todas las rutas de carrito
router.use("/", carritoRoutes);

export default router;
