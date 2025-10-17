import { Router } from "express";
import { authRequired } from "../middlewares/validateToken.middleware.js";
import User from "../models/user.model.js";
import { Producto as Product } from "../models/product.model.js";

const router = Router();

// Obtener favoritos del usuario
router.get("/:userId/favorites", authRequired, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar que el usuario autenticado sea el mismo que solicita los favoritos
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para ver estos favoritos"
      });
    }

    // Buscar usuario y poblar los favoritos
    const user = await User.findById(userId).populate('favorites', 'nombre descripcion imagen precioBase');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    res.json({
      success: true,
      ok: true,
      favorites: user.favorites
    });
  } catch (error) {
    console.error("Error al obtener favoritos:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

// Agregar producto a favoritos
router.post("/:userId/favorites/:productId", authRequired, async (req, res) => {
  try {
    const { userId, productId } = req.params;

    // Verificar que el usuario autenticado sea el mismo
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para modificar estos favoritos"
      });
    }

    // Verificar que el producto existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado"
      });
    }

    // Verificar que el producto no esté ya en favoritos
    const user = await User.findById(userId);
    if (user.favorites.includes(productId)) {
      return res.status(400).json({
        success: false,
        message: "El producto ya está en favoritos"
      });
    }

    // Agregar el producto a favoritos
    user.favorites.push(productId);
    await user.save();

    res.json({
      success: true,
      message: "Producto agregado a favoritos"
    });
  } catch (error) {
    console.error("Error al agregar favorito:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

// Quitar producto de favoritos
router.delete("/:userId/favorites/:productId", authRequired, async (req, res) => {
  try {
    const { userId, productId } = req.params;

    // Verificar que el usuario autenticado sea el mismo
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para modificar estos favoritos"
      });
    }

    // Quitar el producto de favoritos
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { favorites: productId } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    res.json({
      success: true,
      message: "Producto quitado de favoritos"
    });
  } catch (error) {
    console.error("Error al quitar favorito:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

export default router;