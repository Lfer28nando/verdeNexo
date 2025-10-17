export const validateRole = (roles) => (req, res, next) => {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    // Verificar que el usuario tenga el rol requerido
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
            message: 'Acceso denegado: permisos insuficientes',
            requiredRoles: roles,
            userRole: req.user.role
        });
    }
    
    next();
};

// Constantes de roles
export const ROLES = {
    ADMIN: 'admin',
    SELLER: 'seller',
    CLIENT: 'client'
};

// Middlewares específicos por rol
export const onlyAdmin = (req, res, next) => validateRole([ROLES.ADMIN])(req, res, next);
export const onlySeller = (req, res, next) => validateRole([ROLES.SELLER])(req, res, next);
export const onlyClient = (req, res, next) => validateRole([ROLES.CLIENT])(req, res, next);

// Middlewares combinados
export const adminOrSeller = (req, res, next) => validateRole([ROLES.ADMIN, ROLES.SELLER])(req, res, next);
export const anyAuthenticatedUser = (req, res, next) => validateRole([ROLES.ADMIN, ROLES.SELLER, ROLES.CLIENT])(req, res, next);
