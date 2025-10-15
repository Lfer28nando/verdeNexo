const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');

// En este proyecto las vistas y assets están dentro de la carpeta `src`
app.set('views', path.join(__dirname, 'src', 'views'));

// Servir archivos estáticos desde src/public
app.use(express.static(path.join(__dirname, 'src', 'public')));


//rutas
app.get('/', (req, res) => {
    res.render('pages/index');
});

app.get('/register', (req, res) => {
    res.render('pages/register');
});
app.get('/login', (req, res) => {
    res.render('pages/login');
});
app.get('/auth', (req, res) => {
    res.render('pages/auth');
});
app.get('/perfil', (req, res) => {
    res.render('pages/perfil');
});
app.get('/recuperar', (req, res) => {
    res.render('pages/recuperar');
});
app.get('/admin', (req, res) => {
    res.render('pages/admin');
});
app.get('/catalogo', (req, res) => {
    res.render('pages/catalogo');
});
app.get('/carrito', (req, res) => {
    res.render('pages/carrito');
});
app.get('/checkout', (req, res) => {
    res.render('pages/checkout');
});
app.get('/pedido-confirmado', (req, res) => {
    res.render('pages/pedido-confirmado');
});

const PORT = process.env.PORT || 5173;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frontend corriendo en puerto ${PORT}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
});
