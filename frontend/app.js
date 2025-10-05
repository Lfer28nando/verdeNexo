const express = require('express');
const path = require('path');

const app = express();

// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
    res.render('paginas/inicio');
});

// Ruta admin
app.get('/admin', (req, res) => {
    res.render('paginas/homeAdmin');
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'verdenexo-frontend' });
});

// Puerto configurable para Render
const PORT = process.env.PORT || 4444;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎨 Frontend corriendo en puerto ${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});