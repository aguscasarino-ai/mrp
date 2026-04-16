# MI NEGOCIO PROPIO

Sistema MRP minimalista para gestión de inventario, producción y ventas.

## Características

- **Inventario:** Gestión de materias primas y productos terminados.
- **Producción:** Creación de recetas (BOM) y órdenes de producción.
- **Compras:** Gestión de órdenes de compra a proveedores.
- **Ventas:** Registro de ventas y facturación.
- **Dashboard:** Visualización de métricas clave del negocio.

## Tecnologías Utilizadas

- **Frontend:** React 19, Vite, Tailwind CSS 4.
- **Backend:** Node.js, Express.
- **Base de Datos:** Firebase Firestore.
- **Autenticación:** Firebase Auth.
- **UI:** Shadcn/UI, Lucide React, Motion.

## Configuración Local

1. Clona el repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno:
   Crea un archivo `.env` basado en `.env.example` y agrega tus credenciales de Firebase y Gemini API.
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo (Express + Vite).
- `npm run build`: Compila la aplicación para producción.
- `npm run start`: Inicia la aplicación en modo producción.
- `npm run lint`: Ejecuta el linter de TypeScript.

## Licencia

Este proyecto es privado.
