import { Router } from "express";

const router = Router();

// TODO: Implementar rutas de two-factor authentication
// Placeholder routes para evitar errores de import

router.post("/enable", (req, res) => {
  res.json({ 
    ok: true, 
    message: "2FA routes not implemented yet" 
  });
});

export default router;
