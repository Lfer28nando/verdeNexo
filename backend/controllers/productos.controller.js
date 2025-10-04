// controllers/producto.controller.js
import { Producto } from "../models/producto/index.js";
import fs from "fs";
import path from "path";
import { BadRequest, NotFound } from "../utils/error.js";
import { validarNombreProducto, validarDescripcion, validarPrecio, validarCategoria, validarSlug, validarStock, validarAtributo, validarValor } from "../utils/validator.js";

// ============================
// RF-PROD-00 - Obtener todos los productos
// ============================
export async function obtenerProductos(req, res) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      categoria,
      disponible,
      minPrecio,
      maxPrecio 
    } = req.query;

    // Construir filtros
    const filtros = {};
    if (categoria) filtros.categoria = categoria;
    if (disponible !== undefined) filtros.disponibilidad = disponible === 'true';
    if (minPrecio || maxPrecio) {
      filtros.precioBase = {};
      if (minPrecio) filtros.precioBase.$gte = Number(minPrecio);
      if (maxPrecio) filtros.precioBase.$lte = Number(maxPrecio);
    }

    // Paginación
    const skip = (page - 1) * limit;
    
    // Consulta con paginación
    const productos = await Producto.find(filtros)
      .skip(skip)
      .limit(Number(limit))
      .sort({ creadoEn: -1 });

    // Contar total para paginación
    const total = await Producto.countDocuments(filtros);

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
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}

// ============================
// RF-PROD-01 - Registrar producto
// ============================
export async function crearProducto(req, res) {
  try {
    console.log('[DEBUG] Datos recibidos para crear producto:', req.body);
    
    const { 
      nombre, 
      descripcion, 
      precioBase, 
      categoria, 
      stock, 
      disponibilidad, 
      etiquetas 
    } = req.body;

    // 1) Sanitización
    const nombreClean = typeof nombre === 'string' ? nombre.trim() : nombre;
    const descripcionClean = typeof descripcion === 'string' ? descripcion.trim() : descripcion;
    const categoriaClean = typeof categoria === 'string' ? categoria.trim().toLowerCase() : categoria;

    // 2) Validaciones con datos limpios
    validarNombreProducto(nombreClean);
    validarPrecio(precioBase);
    if (descripcionClean) validarDescripcion(descripcionClean);
    if (categoriaClean) validarCategoria(categoriaClean);

    // 3) Crear producto con datos limpios
    const datosProducto = {
      nombre: nombreClean,
      descripcion: descripcionClean,
      precioBase,
      categoria: categoriaClean,
      stock: stock || 0,
      disponibilidad: disponibilidad !== false,
      etiquetas: Array.isArray(etiquetas) ? etiquetas : []
    };

    console.log('[DEBUG] Datos a guardar en BD:', datosProducto);

    const nuevoProducto = new Producto(datosProducto);
    const productoGuardado = await nuevoProducto.save();
    
    console.log('[DEBUG] Producto guardado exitosamente:', productoGuardado._id);
    res.status(201).json({ ok: true, data: productoGuardado });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}

// ============================
// RF-PROD-02 - Editar producto
// ============================
export async function editarProducto(req, res) {
  try {
    const { id } = req.params;
    const datos = req.body;

    // 1) Sanitización de campos presentes
    const cleanData = { ...datos };
    if (cleanData.nombre) cleanData.nombre = cleanData.nombre.trim();
    if (cleanData.descripcion) cleanData.descripcion = cleanData.descripcion.trim();
    if (cleanData.categoria) cleanData.categoria = cleanData.categoria.trim().toLowerCase();

    // 2) Validaciones con datos limpios
    if (cleanData.nombre) validarNombreProducto(cleanData.nombre);
    if (cleanData.descripcion) validarDescripcion(cleanData.descripcion);
    if (cleanData.precioBase) validarPrecio(cleanData.precioBase);
    if (cleanData.categoria) validarCategoria(cleanData.categoria);

    // 3) Actualizar con datos limpios
    const producto = await Producto.findByIdAndUpdate(id, cleanData, { new: true, runValidators: true });
    if (!producto) {
      throw new NotFound('Producto no encontrado');
    }

    res.json({ ok: true, data: producto });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}

// ============================
// RF-PROD-03 - Eliminar producto
// ============================
export async function eliminarProducto(req, res) {
  const { id } = req.params;
  const producto = await Producto.findByIdAndDelete(id);

  if (!producto) {
    throw NotFound("Producto no encontrado");
  }

  res.json({ ok: true, message: "Producto eliminado correctamente" });
}
// ============================
// RF-PROD-04 - Cargar imágenes
// ============================
export async function subirImagen(req, res) {
  const { id } = req.params;

  if (!req.file) {
    throw BadRequest("No se cargó ninguna imagen");
  }

  const producto = await Producto.findById(id);
  if (!producto) {
    throw NotFound("Producto no encontrado");
  }

  producto.imagenes.push(req.file.filename);
  await producto.save();

  res.json({ 
    ok: true, 
    data: {
      message: "Imagen subida correctamente", 
      archivo: req.file.filename,
      producto: producto._id
    }
  });
}
// ============================
// RF-PROD-05 - Configurar variantes
// ============================
export async function agregarVariante(req, res) {
  const { id } = req.params;
  const { atributo, valor, precio, stock } = req.body;

  // 1) Sanitización
  const atributoClean = typeof atributo === 'string' ? atributo.trim().toLowerCase() : atributo;
  const valorClean = typeof valor === 'string' ? valor.trim() : valor;

  // 2) Validaciones con datos limpios
  validarAtributo(atributoClean);
  validarValor(valorClean);
  if (precio !== undefined) validarPrecio(precio);
  if (stock !== undefined) validarStock(stock);

  // 3) Buscar producto
  const producto = await Producto.findById(id);
  if (!producto) {
    throw NotFound("Producto no encontrado");
  }

  // 4) Agregar variante con datos limpios
  producto.variantes.push({ 
    atributo: atributoClean, 
    valor: valorClean, 
    precio, 
    stock 
  });
  await producto.save();

  res.json({ ok: true, data: producto });
}

// ============================
// RF-PROD-06 - Precios
// ============================
export async function actualizarPrecios(req, res) {
  const { id } = req.params;
  const { precioBase, listasPrecios } = req.body;

  // 1) Validaciones
  if (precioBase !== undefined) validarPrecio(precioBase);
  // TODO: Agregar validación para listasPrecios si es necesario

  // 2) Buscar y actualizar
  const producto = await Producto.findById(id);
  if (!producto) {
    throw NotFound("Producto no encontrado");
  }

  if (precioBase) producto.precioBase = precioBase;
  if (listasPrecios) producto.listasPrecios = listasPrecios;

  await producto.save();
  res.json({ ok: true, data: producto });
}

// ============================
// RF-PROD-07 - Disponibilidad
// ============================
export async function verificarDisponibilidad(req, res){
    const { id } = req.params;
    const producto = await Producto.findById(id);

    if (!producto) {
    throw NotFound("Producto no encontrado");
  }

    res.json({ok:true, data:{disponible: producto.disponibilidad }});
  }

// ============================
// RF-PROD-08 - SEO
// ============================
export async function actualizarSEO(req, res) {
  const { id } = req.params;
  const { slug, metaTitulo, metaDescripcion } = req.body;

  // 1) Sanitización
  const slugClean = typeof slug === 'string' ? slug.trim().toLowerCase() : slug;
  const metaTituloClean = typeof metaTitulo === 'string' ? metaTitulo.trim() : metaTitulo;
  const metaDescripcionClean = typeof metaDescripcion === 'string' ? metaDescripcion.trim() : metaDescripcion;

  // 2) Validaciones con datos limpios
  if (slugClean) validarSlug(slugClean);
  if (metaTituloClean && metaTituloClean.length > 60) {
    throw BadRequest('Meta título no puede exceder 60 caracteres.');
  }
  if (metaDescripcionClean && metaDescripcionClean.length > 160) {
    throw BadRequest('Meta descripción no puede exceder 160 caracteres.');
  }

  // 3) Buscar y actualizar
  const producto = await Producto.findById(id);
  if (!producto) {
    throw NotFound("Producto no encontrado");
  }

  producto.seo = { 
    slug: slugClean, 
    metaTitulo: metaTituloClean, 
    metaDescripcion: metaDescripcionClean 
  };
  await producto.save();

  res.json({ ok: true, data: producto });
}
// ============================
// RF-PROD-09 - Descargar ficha técnica
// ============================
export async function descargarFichaTecnica(req, res){
    const { id } = req.params;
    const producto = await Producto.findById(id);

    if (!producto || !producto.fichaTecnica) {
      throw NotFound("Ficha técnica no encontrada");
    }

    const ruta = path.resolve("uploads/fichas", producto.fichaTecnica);
    if (!fs.existsSync(ruta)) {
      throw NotFound("Archivo no encontrado en el servidor");
    }

    res.download(ruta);
  }

// ============================
// RF-PROD-10 - Buscar
// ============================
export async function buscarProductos(req, res){
    const { q } = req.query;
    if (!q){ 
      throw BadRequest("Debe proporcionar un término de búsqueda");
    }

    const productos = await Producto.find({
      $text: { $search: q }
    });

    res.json({ ok: true, data: productos });
  }
// ============================
// RF-PROD-11 - Filtrar
// ============================
export async function filtrarProductos(req, res){
    const { categoria, minPrecio, maxPrecio, disponibilidad } = req.query;
    const filtro = {};

    if (categoria) filtro.categoria = categoria;
    if (disponibilidad) filtro.disponibilidad = disponibilidad === "true";
    if (minPrecio || maxPrecio) {
      filtro.precioBase = {};
      if (minPrecio) filtro.precioBase.$gte = Number(minPrecio);
      if (maxPrecio) filtro.precioBase.$lte = Number(maxPrecio);
    }

    const productos = await Producto.find(filtro);
    res.json({ok: true, data: productos});
  }
// ============================
// RF-PROD-12 - Ordenar
// ============================
export async function ordenarProductos(req, res){
    const { campo = "precioBase", orden = "asc" } = req.query;
    const productos = await Producto.find().sort({ [campo]: orden === "asc" ? 1 : -1 });

    res.json({ok: true, data: productos});
  }
// ============================
// RF-PROD-13 - Relacionados
// ============================
export async function obtenerRelacionados(req, res){
    const { id } = req.params;
    const producto = await Producto.findById(id).populate("relacionados");

    if (!producto) {
    throw NotFound("Producto no encontrado");
  }

    res.json({ok: true, data: producto.relacionados });
  }
// ============================
// RF-PROD-14 - Combinar productos
// ============================
export async function combinarProductos(req, res){
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      throw BadRequest("Debe enviar un array de IDs");
    }

    const productos = await Producto.find({ _id: { $in: ids } });
    if (productos.length === 0){
      throw NotFound("No se encontraron productos");
    }

    res.json({
      ok: true,
      data:{
      combinacion: productos.map(p => ({
        id: p._id,
        nombre: p.nombre,
        precio: p.precioBase
      }))
     }
    });
  }
// ============================
// RF-PROD-15 - Califi
// ============================
export async function calificarProducto(req, res){
    const { id } = req.params;
    const { usuarioId, estrellas, comentario } = req.body;

    if (!usuarioId || !estrellas) {
      throw BadRequest("Usuario y estrellas son obligatorios");
    }

    const producto = await Producto.findById(id);
    if (!producto) {
    throw NotFound("Producto no encontrado");
  }

    producto.calificaciones.push({ usuarioId, estrellas, comentario });
    await producto.save();

    res.json({ok: true, data: producto});
  }

export async function agregarEtiqueta(req, res) {
  const { id } = req.params;
  const { etiqueta } = req.body;

  if (!etiqueta) {
    throw BadRequest("Debe enviar una etiqueta");
  }

  const producto = await Producto.findById(id);
  if (!producto) {
    throw NotFound("Producto no encontrado");
  }

  if (!producto.etiquetas.includes(etiqueta)) {
    producto.etiquetas.push(etiqueta);
    await producto.save();
  }

  res.json({ ok: true, data: producto });
}

// ============================
// RF-PROD-17 - Visibilidad
// ============================
export async function actualizarVisibilidad(req, res) {
  const { id } = req.params;
  const { canales } = req.body;

  if (!Array.isArray(canales)) {
    throw BadRequest("Canales debe ser un array");
  }

  const producto = await Producto.findById(id);
  if (!producto) {
    throw NotFound("Producto no encontrado");
  }

  producto.canalesVisibilidad = canales;
  await producto.save();

  res.json({ ok: true, data: producto });
}
