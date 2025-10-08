import { Router } from "express";
import pedidosRoutes from "./pedidos.routes.js";

const router = Router();

// Usar todas las rutas de pedidos
router.use("/", pedidosRoutes);

export default router;
