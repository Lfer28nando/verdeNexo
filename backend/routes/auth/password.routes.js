import { Router } from "express";

const router = Router();

// TODO: Implementar rutas de password (reset, change, etc.)
// Placeholder routes para evitar errores de import

router.post("/reset", (req, res) => {
  res.json({ 
    ok: true, 
    message: "Password routes not implemented yet" 
  });
});

export default router;
