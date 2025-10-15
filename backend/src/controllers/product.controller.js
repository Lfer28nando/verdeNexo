import { Producto } from "../models/product.model.js";
import mongoose from 'mongoose';
import fs from "fs";
import path from "path";
import { createError } from "../utils/customError.js";

// Obtener todos los productos
 
export const getAllProducts = async (req, res, next) => { //sirve para listar productos con paginación y filtros
    try {
        const {
            page = 1,
            limit = 10,
            categoria,
            disponible,
            minPrecio,
            maxPrecio,
        } = req.query;
        
// Construir el filtro dinámico
        const filter = {};
        if (categoria) filter.categoria = categoria;
        if (disponible) filter.disponibilidad = disponible === 'true';
        if (minPrecio || maxPrecio) {
            filter.precioBase = {};
            if (minPrecio) filter.precioBase.$gte = Number(minPrecio);
            if (maxPrecio) filter.precioBase.$lte = Number(maxPrecio);
        }
//paginación
const skip = (page - 1) * limit;

// Consulta con filtros y paginación
        const productos = await Producto.find(filter) // aplicar filtros
            .skip(skip) // Saltar los productos de páginas anteriores
            .limit(Number(limit)) // Limitar la cantidad de productos devueltos
            .sort({ creadoEn: -1 }); // ordenar por fecha de creación descendente

            //contar total de productos para paginación
        const total = await Producto.countDocuments(filter);
        res.json({
            ok: true,
            data: productos,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
};

// Registrar Producto
export const createProduct = async (req, res, next) => {
    try {
        // Extraer datos del body
        const {
            nombre,
            descripcion,
            precioBase,
            disponibilidad = true,
            stock = 0,
            etiquetas = [],
            variantes = []
        } = req.body || {};

        // Procesar imágenes
        let imagenes = [];
        if (req.files && req.files["imagenes"]) {
            imagenes = req.files["imagenes"].map(f => f.filename);
        }

        // Procesar ficha técnica
        let fichaTecnica = null;
        if (req.files && req.files["fichaTecnica"] && req.files["fichaTecnica"][0]) {
            fichaTecnica = req.files["fichaTecnica"][0].filename;
        }

        // Procesar etiquetas (puede venir como string o array)
        let etiquetasFinal = Array.isArray(etiquetas) ? etiquetas : (typeof etiquetas === "string" ? etiquetas.split(",").map(t => t.trim()).filter(Boolean) : []);

        // Procesar variantes (puede venir como JSON string)
        let variantesFinal = [];
        if (typeof variantes === "string" && variantes.trim()) {
            try {
                variantesFinal = JSON.parse(variantes);
            } catch (e) {
                variantesFinal = [];
            }
        } else if (Array.isArray(variantes)) {
            variantesFinal = variantes;
        }

        const productData = {
            nombre,
            descripcion,
            precioBase,
            disponibilidad: disponibilidad !== false,
            stock: stock || 0,
            imagenes,
            fichaTecnica,
            etiquetas: etiquetasFinal,
            variantes: variantesFinal
        };
        console.log('DEBUG processed data for new product:', productData);

        const newProduct = new Producto(productData);
        const savedProduct = await newProduct.save();

        console.log('DEBUG saved product:', savedProduct);
        res.status(201).json({ ok: true, data: savedProduct });
    } catch (error) {
        next(error);
    }
};


// Editar Producto
export const editProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const product = await Producto.findById(id);
        if (!product) {
            return next(createError('PROD_01'));
        }

        // Procesar imágenes
        if (req.files && req.files["imagenes"]) {
            data.imagenes = req.files["imagenes"].map(f => f.filename);
        }

        // Procesar ficha técnica
        if (req.files && req.files["fichaTecnica"] && req.files["fichaTecnica"][0]) {
            data.fichaTecnica = req.files["fichaTecnica"][0].filename;
        }

        // Procesar etiquetas (puede venir como string o array)
        if (data.etiquetas) {
            data.etiquetas = Array.isArray(data.etiquetas) ? data.etiquetas : (typeof data.etiquetas === "string" ? data.etiquetas.split(",").map(t => t.trim()).filter(Boolean) : []);
        }

        // Procesar variantes (puede venir como JSON string)
        if (typeof data.variantes === "string" && data.variantes.trim()) {
            try {
                data.variantes = JSON.parse(data.variantes);
            } catch (e) {
                data.variantes = [];
            }
        }

        // Guardar el nombre anterior para detectar cambios
        const oldName = product.nombre;

        // Asignar nuevos datos al producto
        Object.assign(product, data);

        // Si el nombre cambió, regenerar el slug en product.seo.slug
        if (data.nombre && data.nombre !== oldName) {
            // función simple para slugify
            const makeSlug = (text) => text.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-');

            let baseSlug = makeSlug(data.nombre || product.nombre);
            let slug = baseSlug;
            let counter = 1;

            // Asegurar unicidad: buscar otro producto con el mismo slug (excluyendo el actual)
            // Si existe, añadir sufijo incremental
            // Nota: uso de findOne en vez de count permite obtener el documento y evitar colisiones con el propio id
            while (await Producto.findOne({ 'seo.slug': slug, _id: { $ne: product._id } })) {
                slug = `${baseSlug}-${counter}`;
                counter += 1;
            }

            product.seo = product.seo || {};
            product.seo.slug = slug;
        }

        await product.save();

        res.json({ ok: true, data: product });
    } catch (error) {
        next(error);
    }
}

// Eliminar Producto
export const deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await Producto.findByIdAndDelete(id);
        if (!product) {
            return next(createError('PROD_01'));
        }
    res.json({ ok: true, message: 'Producto eliminado' });
} catch (error) {
    next(error);
}
}

//cargar imagenes
export async function uploadProductImage(req, res, next) {
    try {
        const { id } = req.params;
        if (!req.file) {
            return next(createError('IMG_01', { detail: 'No se subió ninguna imagen' }));
        }

        const product = await Producto.findById(id);
        if (!product) {
            return next(createError('PROD_01'));
        }

        product.imagenes.push(req.file.path);
        await product.save();

        res.json({ ok: true, data: { message: 'Imagen subida', path: req.file.path } });
    } catch (error) {
        next(error);
    }
}

//configurar variantes
export async function configureVariants(req, res, next) {
    try {
        const { id } = req.params;
        const { atributo, valor, precio, stock } = req.body;

        const product = await Producto.findById(id);
        if (!product) {
            return next(createError('PROD_01'));
        }

        product.variantes.push({ atributo, valor, precioAdicional: precio || 0, stock: stock || 0 });
        await product.save();

        res.json({ ok: true, data: product });
    } catch (error) {
        next(error);
    }
}

//Actualizar precios
export async function updatePrices(req, res, next) {
    try {
        const { id } = req.params;
        const { precioBase, listasPrecios } = req.body; 

        const product = await Producto.findById(id);
        if (!product) {
            return next(createError('PROD_01'));
        }

        if (precioBase) product.precioBase = precioBase;
        if (listasPrecios) {
            if (!Array.isArray(listasPrecios)) {
                return next(createError('PRICE_01', { detail: 'listasPrecios debe ser un array' }));
            }

            // Validar cada elemento: canal y precio son requeridos
            for (const [idx, lp] of listasPrecios.entries()) {
                if (!lp || typeof lp !== 'object') {
                    return next(createError('PRICE_02', { index: idx }));
                }
                if (!lp.canal) {
                    return next(createError('PRICE_03', { index: idx }));
                }
                if (lp.precio === undefined || lp.precio === null || isNaN(Number(lp.precio))) {
                    return next(createError('PRICE_04', { index: idx }));
                }
                // asegurar tipo número
                lp.precio = Number(lp.precio);
            }

            product.listasPrecios = listasPrecios;
        }
        await product.save();

        res.json({ ok: true, data: product });
    } catch (error) {
        next(error);
    }
}


// verifica Disponibilidad
export async function verifyAvailability(req, res, next) {
    try {
        const { id } = req.params;

        const product = await Producto.findById(id);
        if (!product) {
            return next(createError('PROD_01'));
        }

        res.json({ ok: true, data: { disponible: product.disponibilidad, stock: product.stock } });
    } catch (error) {
        next(error);
    }
}

//SEO
export async function updateSEO(req, res, next) {
    try {
        const { id } = req.params;
        const { slug, metaTitulo, metaDescripcion } = req.body;

        const product = await Producto.findById(id);
        if (!product) {
            return next(createError(404, 'PROD_01', 'Producto no encontrado'));
        }

        product.seo = { slug, metaTitulo, metaDescripcion };
        await product.save();

        res.json({ ok: true, data: product });
    } catch (error) {
        next(error);
    }
}

// Subir ficha técnica (PDF)
export async function uploadTechnicalSheet(req, res, next) {
    try {
        const { id } = req.params;
        // DEBUG: información para entender errores de multer
        console.log('[uploadTechnicalSheet] headers keys:', Object.keys(req.headers || {}));
        console.log('[uploadTechnicalSheet] body keys:', Object.keys(req.body || {}));
        console.log('[uploadTechnicalSheet] file:', req.file);

        if (!req.file) {
            return next(createError('IMG_01', { detail: 'No se subió ningún archivo' }));
        }

        const product = await Producto.findById(id);
        if (!product) {
            return next(createError('PROD_01'));
        }

        // Asegurar carpeta uploads/fichas exist
        const destDir = path.resolve('uploads', 'fichas');
        fs.mkdirSync(destDir, { recursive: true });

    // Guardar sólo el nombre del archivo (basename) en product.fichaTecnica
    const savedName = req.file.filename || path.basename(req.file.path || '');
    product.fichaTecnica = savedName;
        await product.save();

    console.log('[uploadTechnicalSheet] saved fichaTecnica:', product.fichaTecnica, 'for product', product._id);
    res.json({ ok: true, data: { message: 'Ficha técnica subida', file: product.fichaTecnica, productId: product._id } });
    } catch (error) {
        next(error);
    }
}


//download ficha técnica
export async function downloadTechnicalSheet(req, res, next) {
    try {
        const { id } = req.params;
        const product = await Producto.findById(id);
        if (!product) {
            return next(createError('PROD_01'));
        }
        if (!product.fichaTecnica) {
            return next(createError('FICHA_01'));
        }

        // Intentar ruta principal
        const tried = [];
        const ruteFichas = path.resolve('uploads', 'fichas', product.fichaTecnica);
        tried.push(ruteFichas);
        if (fs.existsSync(ruteFichas)) {
            console.log('[downloadTechnicalSheet] Found file at', ruteFichas);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="' + product.fichaTecnica + '"');
            return res.sendFile(ruteFichas);
        }

        // Fallback: tal vez se guardó en uploads/imagenes por mimetype incorrecto
        const ruteImagenes = path.resolve('uploads', 'imagenes', product.fichaTecnica);
        tried.push(ruteImagenes);
        if (fs.existsSync(ruteImagenes)) {
            console.log('[downloadTechnicalSheet] Found file at', ruteImagenes);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="' + product.fichaTecnica + '"');
            return res.sendFile(ruteImagenes);
        }

        console.log('[downloadTechnicalSheet] tried paths:', tried);
    return next(createError('FICHA_01', { detail: 'Archivo de ficha técnica no encontrado en el servidor', tried }));
    } catch (error) {
        next(error);
    }
}

// Eliminar ficha técnica
export async function deleteTechnicalSheet(req, res, next) {
    try {
        const { id } = req.params;
        const product = await Producto.findById(id);
        if (!product) {
            return next(createError('PROD_01'));
        }

        if (!product.fichaTecnica) {
            return next(createError('FICHA_01'));
        }

        const fileName = product.fichaTecnica;
        const pathsToTry = [
            path.resolve('uploads', 'fichas', fileName),
            path.resolve('uploads', 'imagenes', fileName)
        ];

        let deleted = false;
        for (const p of pathsToTry) {
            if (fs.existsSync(p)) {
                try {
                    fs.unlinkSync(p);
                    console.log('[deleteTechnicalSheet] deleted file', p);
                    deleted = true;
                    break;
                } catch (err) {
                    console.error('[deleteTechnicalSheet] error deleting', p, err);
                    return next(createError('FICHA_02', { originalError: err.message }));
                }
            }
        }

        // Limpiar referencia en producto aunque no exista el archivo en disco
        product.fichaTecnica = null;
        await product.save();

        if (!deleted) {
            // No existía el archivo, pero ya limpiamos la referencia
            return res.json({ ok: true, data: { message: 'Referencia de ficha técnica eliminada (archivo no encontrado en disco)' } });
        }

        res.json({ ok: true, data: { message: 'Ficha técnica eliminada' } });
    } catch (error) {
        next(error);
    }
}

//Buscar
export const searchProducts = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q) {
            return next(createError('PROD_02', { detail: 'Parámetro de búsqueda es requerido' }));
        }

        const productos = await Producto.find({
            $text: { $search: q }
        });
        res.json({ ok: true, data: productos });
    } catch (error) {
        next(error);
    }
}

// Ordenar
export const sortProducts = async (req, res, next) => {
    try {
        const { sortBy = 'precioBase', order = 'asc' } = req.query;
        const sortOrder = order === 'asc' ? 1 : -1;

        const productos = await Producto.find().sort({ [sortBy]: sortOrder });
        res.json({ ok: true, data: productos });
    } catch (error) {
        next(error);
    }
}

//Relacionados
export const getRelatedProducts = async (req, res, next) => {
    try {
        const { id } = req.params;

        const product = await Producto.findById(id).populate('relacionados');
        if (!product) {
            return next(createError(404, 'PROD_01', 'Producto no encontrado'));
        }

        res.json({ ok: true, data: product.relacionados });
    } catch (error) {
        next(error);
    }
}

//combinar productos
export const combineProducts = async (req, res, next) => {
    try {
        const { ids } = req.body; // espera un array de IDs
        if (!ids || !Array.isArray(ids) || ids.length < 2) {
            return next(createError(400, 'PROD_03', 'Se requieren al menos dos IDs de productos para combinar'));
        }
        // Sanear ids: quitar dobles llaves tipo {{...}} y espacios
        const cleanedIds = ids.map(id => {
            if (typeof id !== 'string') return id;
            // quitar espacios alrededor
            let s = id.trim();
            // si viene como {{...}} extraer contenido
            const m = s.match(/^\{\{\s*(.*?)\s*\}\}$/);
            if (m) s = m[1];
            return s;
        });

        // Validar formato de ObjectId antes de consultar a MongoDB
        const invalidIds = cleanedIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return next(createError('VAL_INVALID_OBJECT_ID', { invalidIds }));
        }
        
    const products = await Producto.find({ _id: { $in: cleanedIds } });
        if (products.length !== ids.length) {
            return next(createError(404, 'PROD_01', 'Uno o más productos no encontrados'));
        }
        // Construir un resumen de los productos combinados
        const combined = products.map(p => ({
            id: p._id.toString(),
            nombre: p.nombre,
            precioBase: p.precioBase
        }));

        res.json({ ok: true, data: { combined, count: combined.length } });
    } catch (error) {
        next(error);
    }
}

//Calif
export const rateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { estrellas, comentario } = req.body;
        const usuarioId = req.user._id; // Obtener del usuario autenticado

        if (!estrellas) {
            return next(createError(400, 'CAL_01', 'Las estrellas son requeridas'));
        }
        if (estrellas < 1 || estrellas > 5) {
            return next(createError(400, 'CAL_02', 'Estrellas debe estar entre 1 y 5'));
        }

        const product = await Producto.findById(id);
        if (!product) {
            return next(createError(404, 'PROD_01', 'Producto no encontrado'));
        }

        // Verificar si el usuario ya ha calificado este producto
        const existingRating = product.calificaciones.find(cal =>
            cal.usuarioId.toString() === usuarioId.toString()
        );

        if (existingRating) {
            return next(createError(400, 'CAL_03', 'Ya has calificado este producto'));
        }

        // Agregar nueva calificación
        product.calificaciones.push({
            usuarioId,
            estrellas: Number(estrellas),
            comentario: comentario || undefined,
            fecha: new Date()
        });

        await product.save();

        res.json({
            ok: true,
            data: product,
            message: 'Calificación agregada exitosamente'
        });
    } catch (error) {
        next(error);
    }
}

// Etiquetas
export const addProductTags = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { etiquetas } = req.body;
        if (!etiquetas) {
            return next(createError(400, 'TAG_01', 'Se requieren etiquetas para agregar'));
        }

        const product = await Producto.findById(id);
        if (!product) {
            return next(createError(404, 'PROD_01', 'Producto no encontrado'));
        }
        if(!product.etiquetas.includes(etiquetas)){
            product.etiquetas.push(etiquetas);
            await product.save();
        }

        res.json({ ok: true, data: product });
    } catch (error) {
        next(error);
    }
}

// Visibilidad por canal
export const setProductVisibilityChannels = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { canales } = req.body;
        
        if (!canales || !Array.isArray(canales)) {
            return next(createError(400, 'CANAL_01', 'Se requiere un array de canales'));
        }
        
        const product = await Producto.findById(id);
        if (!product) {
            return next(createError(404, 'PROD_01', 'Producto no encontrado'));
        }
        
        product.canalesVisibilidad = canales;
        await product.save();
        
        res.json({ ok: true, data: product });
    } catch (error) {
        next(error);
    }
}

// Obtener producto por ID
export const getProductById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const product = await Producto.findById(id);
        if (!product) {
            return next(createError(404, 'PROD_01', 'Producto no encontrado'));
        }
        res.json({ ok: true, data: product });
    } catch (error) {
        next(error);
    }
}

// Productos destacados
export const getFeaturedProducts = async (req, res, next) => {
    try {
        let productos = await Producto.find({ etiquetas: 'destacado' }).limit(6).sort({ creadoEn: -1 });
        if (productos.length === 0) {
            // Fallback: obtener los primeros 6 productos disponibles
            productos = await Producto.find({ disponibilidad: true }).limit(6).sort({ creadoEn: -1 });
        }
        res.json({
            ok: true,
            data: productos
        });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
};

// Filtrar productos avanzado
export const filterProducts = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 12,
            search = '',
            sort = 'nombre',
            minPrice = '',
            maxPrice = '',
            categories = '',
            availability = '',
            tags = ''
        } = req.query;

        // Construir el filtro dinámico
        const filter = {};

        // Filtro de búsqueda por nombre o descripción
        if (search && search.trim()) {
            filter.$or = [
                { nombre: { $regex: search.trim(), $options: 'i' } },
                { descripcion: { $regex: search.trim(), $options: 'i' } }
            ];
        }

        // Filtro por precio
        if (minPrice || maxPrice) {
            filter.precioBase = {};
            if (minPrice && !isNaN(Number(minPrice))) {
                filter.precioBase.$gte = Number(minPrice);
            }
            if (maxPrice && !isNaN(Number(maxPrice))) {
                filter.precioBase.$lte = Number(maxPrice);
            }
        }

        // Filtro por categorías
        if (categories && categories.trim()) {
            const categoryArray = categories.split(',').map(c => c.trim()).filter(Boolean);
            if (categoryArray.length > 0) {
                filter.categoria = { $in: categoryArray };
            }
        }

        // Filtro por disponibilidad
        if (availability && availability.trim()) {
            const availabilityArray = availability.split(',').map(a => a.trim()).filter(Boolean);
            if (availabilityArray.length > 0) {
                const availabilityValues = availabilityArray.map(a => a === 'true');
                filter.disponibilidad = { $in: availabilityValues };
            }
        }

        // Filtro por etiquetas
        if (tags && tags.trim()) {
            const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
            if (tagsArray.length > 0) {
                filter.etiquetas = { $in: tagsArray };
            }
        }

        // Construir opciones de ordenamiento
        let sortOptions = {};
        switch (sort) {
            case 'nombre':
                sortOptions = { nombre: 1 };
                break;
            case 'precioBase':
                sortOptions = { precioBase: 1 };
                break;
            case '-precioBase':
                sortOptions = { precioBase: -1 };
                break;
            case '-createdAt':
                sortOptions = { creadoEn: -1 };
                break;
            case 'createdAt':
                sortOptions = { creadoEn: 1 };
                break;
            default:
                sortOptions = { nombre: 1 };
        }

        // Paginación
        const skip = (Number(page) - 1) * Number(limit);

        // Ejecutar consulta
        const productos = await Producto.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit));

        // Contar total para paginación
        const total = await Producto.countDocuments(filter);
        const pages = Math.ceil(total / Number(limit));

        res.json({
            ok: true,
            data: {
                products: productos,
                total,
                pages,
                currentPage: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('Error in filterProducts:', error);
        res.status(500).json({ ok: false, message: error.message });
    }
};