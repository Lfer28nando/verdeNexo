// Servicio centralizado para peticiones HTTP con API key
class ApiService {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
    }

    // Método GET
    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers: CONFIG.getDefaultHeaders(),
                credentials: 'include'
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error en petición GET:', error);
            throw error;
        }
    }

    // Método POST
    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: CONFIG.getDefaultHeaders(),
                body: JSON.stringify(data),
                credentials: 'include'
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error en petición POST:', error);
            throw error;
        }
    }

    // Método POST para archivos (FormData)
    async postFile(endpoint, formData) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: CONFIG.getFileHeaders(),
                body: formData,
                credentials: 'include'
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error en petición POST file:', error);
            throw error;
        }
    }

    // Método PUT
    async put(endpoint, data) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'PUT',
                headers: CONFIG.getDefaultHeaders(),
                body: JSON.stringify(data),
                credentials: 'include'
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error en petición PUT:', error);
            throw error;
        }
    }

    // Método DELETE
    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'DELETE',
                headers: CONFIG.getDefaultHeaders(),
                credentials: 'include'
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error en petición DELETE:', error);
            throw error;
        }
    }

    // Manejar respuestas HTTP
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            // Si es error 401, posiblemente la API key sea incorrecta
            if (response.status === 401) {
                console.error('Error de autenticación: Verifica la API key');
                throw new Error('API key inválida o ausente');
            }
            // Otros errores
            throw new Error(data.mensaje || `Error HTTP: ${response.status}`);
        }
        
        return data;
    }
}

// Crear instancia global del servicio
const apiService = new ApiService();