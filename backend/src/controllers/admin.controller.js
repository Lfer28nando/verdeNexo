import User from "../models/user.model.js";
import { Producto as Product } from "../models/product.model.js";

// Dashboard principal del administrador
export const getAdminDashboard = async (req, res, next) => {
    try {
        // Estadísticas generales
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const activeProducts = await Product.countDocuments({ disponibilidad: true });

        // Usuarios por rol
        const usersByRole = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        // Productos recientes (últimos 10)
        const recentProducts = await Product.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('nombre precioBase disponibilidad createdAt');

        // Usuarios recientes (últimos 10)
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('username email role createdAt verifiedEmail');

        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    totalProducts,
                    activeProducts,
                    inactiveProducts: totalProducts - activeProducts
                },
                usersByRole,
                recentProducts,
                recentUsers
            }
        });

    } catch (error) {
        next(error);
    }
};

// Gestión de usuarios
export const getUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires -twoFactorSecret -twoFactorBackupCodes')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments();

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// Actualizar rol de usuario
export const updateUserRole = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        const validRoles = ['client', 'seller', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Rol inválido'
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true, select: '-password' }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Rol actualizado correctamente',
            user
        });

    } catch (error) {
        next(error);
    }
};

// Eliminar usuario (admin)
export const deleteUser = async (req, res, next) => {
    try {
        const { userId } = req.params;

        // No permitir que un admin se elimine a sí mismo
        if (userId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminar tu propia cuenta'
            });
        }

        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Usuario eliminado correctamente'
        });

    } catch (error) {
        next(error);
    }
};

// Gestión de productos
export const getProducts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const products = await Product.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments();

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// Cambiar disponibilidad de producto
export const toggleProductAvailability = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        product.disponibilidad = !product.disponibilidad;
        await product.save();

        res.json({
            success: true,
            message: `Producto ${product.disponibilidad ? 'activado' : 'desactivado'} correctamente`,
            product
        });

    } catch (error) {
        next(error);
    }
};