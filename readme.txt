
EndPoints:

GET http://127.0.0.1:8000/api/test/productos/ -> Muestra los productos registrados.

GET http://127.0.0.1:8000/api/test/productos/count/ -> Muestra el número de productos activos.

POST http://127.0.0.1:8000/usuarios/registrar/ -> Registrar un usuario
Ejemplo body JSON:
{
	"email": "test2@example.com",
	"nombre": "test",
	"apellido": "user",
	"password": "Test*2025"
}

POST http://127.0.0.1:8000/usuarios/token/ -> Entrega par de tokens JWT (access, refresh)

GET http://127.0.0.1:8000/usuarios/test1@example.com/ -> Endpoint protegido (requiere token válido)

GET http://127.0.0.1:8000/usuarios/logout/ -> Página de logout

POST http://127.0.0.1:8000/usuarios/login/ -> Inicio de sesión
Ejemplo body JSON:
{
	"email": "test1@example.com",
	"password": "Test*2025"
}


INSTRUCCIONES PARA EJECUTAR EL PROYECTO

1) Preparar el entorno y moverme al proyecto
- Abrir el la carpeta del proyecto en la terminal

2) Crear y activar un entorno virtual
- Creo un entorno virtual usando venv:

	python -m venv .venv
	
- Activo el entorno virtual:

3) Instalar dependencias
- Instalo las dependencias del proyecto:
	
	pip install -r requirements.txt
	

4) Migraciones y crear superusuario
- Aplico migraciones:

	python manage.py migrate

- Creo un superusuario si lo necesito:

	python manage.py createsuperuser
	

5) Ejecutar el servidor de desarrollo
- Inicio el servidor:

	python manage.py runserver
	
- Abro en el navegador:
	- Home: http://127.0.0.1:8000/
	- Admin: http://127.0.0.1:8000/admin/
	

6) Probar endpoints con Postman (resumen)
- Registrar usuario:
	- POST /usuarios/registrar/ con body JSON (email, nombre, apellido, password).
- Login:
	- POST /usuarios/login/ con body JSON (email, password). Respuesta incluye tokens.
	- Alternativa: POST /usuarios/token/ para obtener access/refresh.
- Logout por sesión:
	- POST /usuarios/logout/session/
	- En Postman: añadir Header `Cookie: sessionid=<valor>` o usar la gestión de cookies.


