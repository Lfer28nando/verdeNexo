// controllers/producto.controller.js
import { Producto } from "../models/producto.model.js";
import fs from "fs";
import path from "path";

// ============================
// RF-PROD-01 - Registrar producto
// ============================
export async function crearProducto(req, res) {
  try {
    const { nombre, descripcion, precioBase, categoria } = req.body;

    if (!nombre || !precioBase) {
      return res.status(400).json({ mensaje: "Nombre y precioBase son obligatorios" });
    }

    const nuevoProducto = new Producto({
      nombre,
      descripcion,
      precioBase,
      categoria
    });

    const productoGuardado = await nuevoProducto.save();
    res.status(201).json(productoGuardado);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al crear producto", error: error.message });
  }
}

// ============================
// RF-PROD-02 - Editar producto
// ============================
export async function editarProducto(req, res) {
  try {
    const { id } = req.params;
    const datos = req.body;

    const producto = await Producto.findByIdAndUpdate(id, datos, { new: true });
    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    res.json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al editar producto", error: error.message });
  }
}

// ============================
// RF-PROD-03 - Eliminar producto
// ============================
export async function eliminarProducto(req, res) {
  try {
    const { id } = req.params;
    const producto = await Producto.findByIdAndDelete(id);

    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    res.json({ mensaje: "Producto eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar producto", error: error.message });
  }
}

// ============================
// RF-PROD-04 - Cargar imágenes
// ============================
export async function subirImagen(req, res) {
  try {
    const { id } = req.params;

    if (!req.file) return res.status(400).json({ mensaje: "No se cargó ninguna imagen" });

    const producto = await Producto.findById(id);
    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    producto.imagenes.push(req.file.filename);
    await producto.save();

    res.json({ mensaje: "Imagen subida correctamente", archivo: req.file.filename });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al subir imagen", error: error.message });
  }
}

// ============================
// RF-PROD-05 - Configurar variantes
// ============================
export async function agregarVariante(req, res) {
  try {
    const { id } = req.params;
    const { atributo, valor, precio, stock } = req.body;

    if (!atributo || !valor) {
      return res.status(400).json({ mensaje: "Atributo y valor son obligatorios" });
    }

    const producto = await Producto.findById(id);
    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    producto.variantes.push({ atributo, valor, precio, stock });
    await producto.save();

    res.json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al agregar variante", error: error.message });
  }
}

// ============================
// RF-PROD-06 - Precios
// ============================
export async function actualizarPrecios(req, res) {
  try {
    const { id } = req.params;
    const { precioBase, listasPrecios } = req.body;

    const producto = await Producto.findById(id);
    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    if (precioBase) producto.precioBase = precioBase;
    if (listasPrecios) producto.listasPrecios = listasPrecios;

    await producto.save();
    res.json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar precios", error: error.message });
  }
}

// ============================
// RF-PROD-07 - Disponibilidad
// ============================
export async function verificarDisponibilidad(req, res) {
  try {
    const { id } = req.params;
    const producto = await Producto.findById(id);

    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    res.json({ disponible: producto.disponibilidad });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al verificar disponibilidad", error: error.message });
  }
}

// ============================
// RF-PROD-08 - SEO
// ============================
export async function actualizarSEO(req, res) {
  try {
    const { id } = req.params;
    const { slug, metaTitulo, metaDescripcion } = req.body;

    const producto = await Producto.findById(id);
    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    producto.seo = { slug, metaTitulo, metaDescripcion };
    await producto.save();

    res.json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar SEO", error: error.message });
  }
}

// ============================
// RF-PROD-09 - Descargar ficha técnica
// ============================
export async function descargarFichaTecnica(req, res) {
  try {
    const { id } = req.params;
    const producto = await Producto.findById(id);

    if (!producto || !producto.fichaTecnica) {
      return res.status(404).json({ mensaje: "Ficha técnica no encontrada" });
    }

    const ruta = path.resolve("uploads/fichas", producto.fichaTecnica);
    if (!fs.existsSync(ruta)) {
      return res.status(404).json({ mensaje: "Archivo no encontrado en el servidor" });
    }

    res.download(ruta);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al descargar ficha técnica", error: error.message });
  }
}

// ============================
// RF-PROD-10 - Buscar
// ============================
export async function buscarProductos(req, res) {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ mensaje: "Debe proporcionar un término de búsqueda" });

    const productos = await Producto.find({
      $text: { $search: q }
    });

    res.json(productos);
  } catch (error) {
    res.status(500).json({ mensaje: "Error en la búsqueda", error: error.message });
  }
}

// ============================
// RF-PROD-11 - Filtrar
// ============================
export async function filtrarProductos(req, res) {
  try {
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
    res.json(productos);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al filtrar productos", error: error.message });
  }
}

// ============================
// RF-PROD-12 - Ordenar
// ============================
export async function ordenarProductos(req, res) {
  try {
    const { campo = "precioBase", orden = "asc" } = req.query;
    const productos = await Producto.find().sort({ [campo]: orden === "asc" ? 1 : -1 });

    res.json(productos);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al ordenar productos", error: error.message });
  }
}

// ============================
// RF-PROD-13 - Relacionados
// ============================
export async function obtenerRelacionados(req, res) {
  try {
    const { id } = req.params;
    const producto = await Producto.findById(id).populate("relacionados");

    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    res.json(producto.relacionados);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener relacionados", error: error.message });
  }
}

// ============================
// RF-PROD-14 - Combinar productos
// ============================
export async function combinarProductos(req, res) {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ mensaje: "Debe enviar un array de IDs" });
    }

    const productos = await Producto.find({ _id: { $in: ids } });
    if (productos.length === 0) return res.status(404).json({ mensaje: "No se encontraron productos" });

    res.json({
      combinacion: productos.map(p => ({
        id: p._id,
        nombre: p.nombre,
        precio: p.precioBase
      }))
    });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al combinar productos", error: error.message });
  }
}

// ============================
// RF-PROD-15 - Califi
// ============================
export async function calificarProducto(req, res) {
  try {
    const { id } = req.params;
    const { usuarioId, estrellas, comentario } = req.body;

    if (!usuarioId || !estrellas) {
      return res.status(400).json({ mensaje: "Usuario y estrellas son obligatorios" });
    }

    const producto = await Producto.findById(id);
    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    producto.calificaciones.push({ usuarioId, estrellas, comentario });
    await producto.save();

    res.json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al calificar producto", error: error.message });
  }
}

export async function agregarEtiqueta(req, res) {
  try {
    const { id } = req.params;
    const { etiqueta } = req.body;

    if (!etiqueta) return res.status(400).json({ mensaje: "Debe enviar una etiqueta" });

    const producto = await Producto.findById(id);
    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    if (!producto.etiquetas.includes(etiqueta)) {
      producto.etiquetas.push(etiqueta);
      await producto.save();
    }

    res.json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al agregar etiqueta", error: error.message });
  }
}

// ============================
// RF-PROD-17 - Visibilidad
// ============================
export async function actualizarVisibilidad(req, res) {
  try {
    const { id } = req.params;
    const { canales } = req.body;

    if (!Array.isArray(canales)) {
      return res.status(400).json({ mensaje: "Canales debe ser un array" });
    }

    const producto = await Producto.findById(id);
    if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });

    producto.canalesVisibilidad = canales;
    await producto.save();

    res.json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar", error: error.message });
  }
}
