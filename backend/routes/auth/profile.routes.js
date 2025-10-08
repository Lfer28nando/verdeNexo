import { Router } from "express";

const router = Router();

// TODO: Implementar rutas de perfil de usuario
// Placeholder routes para evitar errores de import

router.get("/", (req, res) => {
  res.json({ 
    ok: true, 
    message: "Profile routes not implemented yet" 
  });
});

export default router;
