# SIRO Inmobiliaria | Sitio Web Premium

Este repositorio contiene la implementación del sitio web corporativo de **SIRO Inmobiliaria**, una inmobiliaria de lujo liderada por **Raquel Ortega**. El sitio web está diseñado con un enfoque modular, de alto rendimiento, y siguiendo estándares modernos de diseño y desarrollo web.

## 🚀 Arquitectura y Tecnologías

El proyecto se basa en una arquitectura estricta de **Separación de Responsabilidades (SoC)**, asegurando que la estructura (HTML), la presentación (CSS/Design Tokens) y la lógica de interacción (JS) se mantengan totalmente desacopladas.

### Stack Tecnológico:
- **Estructura**: HTML5 Semántico.
- **Estilos**: Tailwind CSS (vía CDN optimizado con plugins) + CSS Nativo (Custom Properties / Design Tokens).
- **Lógica e Interacción**: Javascript ES6 modular.
- **Tipografía**: *Playfair Display* (títulos sofisticados) e *Inter* (lectura limpia del cuerpo de texto).
- **Iconografía**: Google Material Symbols Outlined.
- **Hosting**: Optimizado para despliegue inmediato en **Vercel** o **GitHub Pages**.

---

## 📁 Estructura del Proyecto

```bash
web siro/
├── css/
│   ├── design-tokens.css   # Definición centralizada de variables CSS (Colores, Spacing, Fuentes)
│   └── styles.css          # Estilos globales, scrollbars personalizadas y efectos premium (glassmorphism)
├── js/
│   ├── tailwind-config.js  # Configuración unificada del compilador Tailwind CDN (Extensiones de tema)
│   ├── app.js              # Lógica global: menú móvil animado, scroll dinámico y estados activos
│   └── properties.js       # Lógica del catálogo de propiedades: listado dinámico, filtros en tiempo real y buscador
├── index.html              # Página de Inicio (Cómo Trabajamos, Qué Hacemos, Hero)
├── servicios.html          # Detalle de Servicios y El Proceso SIRO
├── propiedades.html        # Buscador y catálogo de propiedades interactivo de lujo
├── contacto.html           # Formulario de contacto premium con mapa de ubicación
├── privacidad.html         # Política de Privacidad corporativa
├── aviso-legal.html        # Términos de Servicio y Aviso Legal
├── flow.html               # Sección integrada del flujo de trabajo unificado
├── vercel.json             # Configuración de Vercel para Clean URLs (rutas sin extensión .html)
└── .gitignore              # Configuración de exclusiones de control de versiones
```

---

## ✨ Características Premium Implementadas

1. **Separación de Responsabilidades Total (SoC)**:
   - Se eliminaron por completo todos los bloques `<style>` e `<script>` en línea de todas las páginas HTML.
   - Las configuraciones de diseño se centralizaron en la carpeta `css/` y `js/tailwind-config.js` para facilitar el mantenimiento y consistencia visual (Atomic Vibe).

2. **Catálogo Interactivo con Filtros en Tiempo Real (`properties.js`)**:
   - Renderización dinámica de tarjetas de propiedades de lujo en `propiedades.html` desde un JSON estructurado.
   - Filtrado en tiempo real sin recarga de página por **Tipo de propiedad** (Villas, Apartamentos, Áticos), **Ubicación** (Donostia, Zarautz, Hondarribia, etc.) y **Rango de precios**.
   - Gestión inteligente de estados vacíos (cuando ningún inmueble cumple el criterio de búsqueda).

3. **Navegación Móvil Adaptativa y Animada**:
   - `app.js` detecta automáticamente la estructura de navegación del escritorio y genera dinámicamente un cajón de navegación móvil animado (*mobile menu drawer*) con efecto de desenfoque de fondo (*backdrop blur*).

4. **Corrección de Codificación y Enlaces**:
   - Reparación de todos los caracteres corruptos en castellano (tildes, eñes) causados por exportaciones.
   - Corrección de rutas y enlaces rotos o sin extensión.
   - Restauración de la experiencia de scroll nativo en todos los navegadores mediante la eliminación de atributos sandbox restrictivos de la etiqueta `<html>`.

---

## 📦 Instrucciones de Despliegue en Vercel

El proyecto está 100% preparado para ser desplegado en **Vercel** en menos de un minuto.

1. **Instalar Vercel CLI (opcional para local)**:
   ```bash
   npm install -g vercel
   ```

2. **Desplegar**:
   Desde la raíz del proyecto, ejecuta:
   ```bash
   vercel
   ```
   *Vercel leerá automáticamente el archivo `vercel.json` y configurará el enrutamiento limpio para que las páginas carguen directamente sin la extensión `.html` en la URL (ej: `/servicios` en lugar de `/servicios.html`).*

---

## 🛠️ Desarrollo Local

Simplemente abre el archivo `index.html` en cualquier navegador web moderno o utiliza un servidor local rápido como **Live Server** (extensión de VSCode) para previsualizar los cambios con recarga automática en tiempo real.
