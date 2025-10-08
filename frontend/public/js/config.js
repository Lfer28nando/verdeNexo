// Configuración del frontend
const CONFIG = {
    // URL del backend - Se actualiza según el entorno
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3333'
        : 'https://verdenexo-backend.onrender.com',
    
    // API Key para autenticación con el backend
    API_KEY: 'verdenexo_dev_123',
    
    // Headers por defecto para todas las peticiones
    getDefaultHeaders: function() {
        return {
            'Content-Type': 'application/json',
            'x-api-key': this.API_KEY
        };
    },
    
    // Headers para peticiones con archivos (FormData)
    getFileHeaders: function() {
        return {
            'x-api-key': this.API_KEY
            // No incluir Content-Type para FormData, el navegador lo añade automáticamente
        };
    }
};