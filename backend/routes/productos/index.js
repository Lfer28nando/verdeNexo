import { Router } from "express";
import productosRoutes from "./productos.routes.js";

const router = Router();

// Usar todas las rutas de productos
router.use("/", productosRoutes);

export default router;
