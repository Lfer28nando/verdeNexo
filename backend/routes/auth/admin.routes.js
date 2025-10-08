import { Router } from "express";

const router = Router();

// TODO: Implementar rutas de administración
// Placeholder routes para evitar errores de import

router.get("/", (req, res) => {
  res.json({ 
    ok: true, 
    message: "Admin routes not implemented yet" 
  });
});

export default router;
