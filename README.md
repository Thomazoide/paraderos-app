# Paraderos App

Aplicación móvil (Expo + React Native + TypeScript) para consultar y gestionar paraderos, formularios y cuentas de usuario.

---

## Descripción

`paraderos-app` es una aplicación móvil construida con Expo y TypeScript que ofrece navegación basada en archivos (app directory) para mostrar paradas de transporte, formularios de reporte/visita y gestión de cuenta. Incluye componentes reutilizables, temas y utilidades para integrarse con APIs externas definidas en `constants/endpoints.ts`.

## Tecnologías

- Expo (React Native)
- TypeScript
- Expo Router (estructura `app/` con `_layout.tsx`)
- Android native project (carpeta `android/`) para builds locales y configuración nativa

## Estructura del proyecto (resumen)

- `app/` — Entradas de la app y pantallas principales (`index.tsx`, `login.tsx`, `_layout.tsx`, pestañas en `(tabs)/`)
- `components/` — Componentes UI reutilizables y subcarpeta `ui/` con controles específicos
- `assets/` — Imágenes y recursos estáticos
- `constants/` — Configuración y endpoints (API)
- `hooks/` — Hooks personalizados para tema y esquema de colores
- `utils/` — Funciones utilitarias generales
- `types/` — Tipos TypeScript para entidades y payloads
- `android/` — Proyecto Android nativo generado por Expo (para builds y ajustes nativos)

## Instalación (desarrollo)

Requisitos previos: Node.js (16+ recomendado), Yarn o npm, Expo CLI.

Instalar dependencias:

```bash
npm install
# o
yarn install
```

Iniciar el servidor de desarrollo (Expo):

```bash
npm run start
# o
yarn start
```

Ejecutar en Android (emulador o dispositivo conectado):

```bash
expo run:android
```

Para builds en la nube con EAS (si está configurado):

```bash
eas build -p android
```

## Desarrollo y pruebas

- La navegación y pantallas principales están en `app/` usando componentes en `components/`.
- Añade nuevas pantallas en `app/` y subrutas en `(tabs)/` para pestañas.
- Estilos y tema centralizados en `constants/theme.ts` y `hooks/use-theme-color.ts`.
