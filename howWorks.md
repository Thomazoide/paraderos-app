# Documentación de Módulos - Paraderos App

## Descripción General

Paraderos App es una aplicación móvil construida con Expo y React Native que permite a los trabajadores de ruta gestionar paraderos (paradas de autobús), formularios de visita, órdenes de trabajo y su información personal. A continuación se detalla el funcionamiento de cada módulo principal.

---

## 📍 Módulo: Paraderos (bus-stops.tsx)

### Propósito

Gestionar la visualización y selección de paraderos (paradas de autobús) en una ruta asignada al trabajador. Permite tanto una vista en mapa interactivo como una vista en lista de todos los paraderos disponibles.

### Funcionalidades Principales

#### 1. **Visualización del Mapa**

- Muestra un mapa interactivo con marcadores de todos los paraderos disponibles
- Utiliza Google Maps como proveedor de mapas
- Muestra la ubicación actual del usuario en tiempo real
- Centro del mapa configurable mediante constantes

#### 2. **Lectura de Paraderos**

- Obtiene la lista completa de paraderos del Backend mediante endpoint `/bus-stops`
- Almacena los datos en estado local
- Carga inicial y actualización mediante "pull to refresh"
- Validación del token de autenticación antes de hacer solicitudes

#### 3. **Búsqueda y Filtrado**

- Filtro de paraderos por código en tiempo real
- Búsqueda sensible a mayúsculas/minúsculas
- Visualización inmediata de resultados

#### 4. **Cálculo de Distancias**

- Calcula la distancia en kilómetros entre la posición actual del usuario y cada paradero
- Utiliza la fórmula de Haversine para cálculos geográficos precisos
- Muestra las distancias en el mapa y lista

#### 5. **Vista de Lista vs Mapa**

- Permite alternar entre vista de mapa y vista de lista
- Lista muestra todos los paraderos con su distancia relativa
- Cada entrada de paradero es seleccionable

#### 6. **Selección de Paradero**

- Al seleccionar un paradero, valida que:
  - Exista una orden de trabajo y ruta activas
  - No hay formularios incompletos asignados al usuario en ese paradero
- Si todo es válido, abre la vista para crear/completar un formulario de visita
- Muestra alertas con instrucciones si hay validaciones fallidas

#### 7. **Persistencia de Datos**

- Guarda en AsyncStorage:
  - Datos de la orden de trabajo activa (WORK_ORDER_DATA)
  - Datos de la ruta asociada (ROUTE_DATA)
- Lee estos datos al cargar para mantener el contexto

### Estados Principales

- `busStops`: Lista de paraderos disponibles
- `loading`: Indicador de carga
- `isMapMode`: Controla vista de mapa vs lista
- `searchQuery`: Búsqueda actual
- `selectedBusStop`: Paradero actualmente seleccionado
- `userLocation`: Ubicación GPS actual del usuario

---

## 📋 Módulo: Formularios (formularios.tsx)

### Propósito

Gestionar los formularios de visita (VisitForm) que el trabajador debe completar en cada paradero. Permite visualizar, filtrar y completar formularios de visita.

### Funcionalidades Principales

#### 1. **Carga de Formularios**

- Obtiene todos los formularios asignados al usuario actual
- Utiliza endpoint `/visit-forms/user/:userId`
- Requiere token de autenticación válido
- Muestra indicador de carga mientras obtiene los datos

#### 2. **Filtrado de Formularios**

- Opción de checkbox para "Ocultar completadas"
- Muestra solo formularios pendientes cuando está activo
- Actualización dinámica de la lista

#### 3. **Visualización de Formularios**

Cada formulario se muestra como una tarjeta con:

- **Número de Formulario**: ID único del formulario
- **Estado**: Dos estados posibles:
  - 🟢 **Completada**: Formulario terminado (fondo verde)
  - 🟠 **Pendiente**: Formulario sin completar (fondo amarillo)
- **Código de Paradero**: Referencia al paradero donde se debe completar
- **Acción**: Botón dinámico

#### 4. **Acciones según Estado**

- **Formulario Pendiente**: Botón "Completar formulario"
  - Al presionar, se abre el componente VisitFormComponent
  - Pasa como props: paradero, orden de trabajo, ID del formulario
- **Formulario Completado**: Botón "Ver formulario"
  - Muestra vista de solo lectura del formulario completado
  - Utiliza componente ViewSelectedForm

#### 5. **Actualización de Datos**

- Soporte para "pull to refresh"
- Re-obtiene la lista de formularios desde el Backend
- Mantiene sincronización con cambios en el servidor

#### 6. **Manejo de Errores**

- Valida existencia de token de acceso
- Valida existencia de datos de usuario
- Muestra mensajes de error descriptivos al usuario
- Opción de reintentar operación

### Estados Principales

- `forms`: Lista de formularios del usuario
- `loading`: Indicador de carga
- `hideCompleted`: Filtro de formularios completados
- `selectedForm`: Formulario actualmente seleccionado para visualizar
- `formProps`: Props para abrir editor de formulario

---

## 📦 Módulo: Órdenes de Trabajo (orders.tsx)

### Propósito

Gestionar las órdenes de trabajo (WorkOrder) asignadas al trabajador. Permite visualizar, aceptar/rechazar órdenes y gestionar el seguimiento de ubicación GPS en tiempo real mientras una orden está activa.

### Funcionalidades Principales

#### 1. **Carga de Órdenes de Trabajo**

- Obtiene todas las órdenes asignadas al usuario actual
- Utiliza endpoint `/work-orders/user/:userId`
- Valida token JWT para identificar al usuario
- Diferencia entre órdenes completadas y pendientes

#### 2. **Filtrado de Órdenes**

- Opción de checkbox para "Ocultar completadas"
- Por defecto muestra solo órdenes sin completar (`uncompletedOrders`)
- Los usuarios pueden ver todas o filtradas según necesidad

#### 3. **Visualización de Órdenes**

Cada orden de trabajo muestra:

- **Código de Orden**: Identificador único
- **Ruta Asignada**: Referencia a la ruta a recorrer
- **Paraderos**: Cantidad total de paraderos en la ruta
- **Estado**: Completada/Pendiente

#### 4. **Aceptar Orden de Trabajo**

Cuando el usuario acepta una orden:

- **Carga la Ruta**: Obtiene datos de paraderos y formularios asociados mediante endpoint `/routes/:routeID`
- **Guarda en AsyncStorage**:
  - Datos de la orden (WORK_ORDER_DATA)
  - Datos de la ruta (ROUTE_DATA)
- **Inicia Seguimiento de GPS**:
  - Solicita permisos de ubicación (foreground y background)
  - Inicia actualización de ubicación cada 10 segundos
  - Transmite la ubicación GPS al Backend mediante WebSocket

#### 5. **Rastreo de Ubicación GPS**

- **Tarea de Fondo** (LOCATION_BACKGROUND_TASK):
  - Se ejecuta automáticamente cada vez que cambia la ubicación
  - Funciona incluso cuando la app está en background
  - Emite evento "actualizar-gps" mediante Socket.IO al servidor
  - Incluye: ID del usuario, latitud, longitud, timestamp

- **Permisos Requeridos**:
  - Ubicación en foreground (mientras la app está activa)
  - Ubicación en background (cuando la app está minimizada)
  - Notificación visual para indicar que se está monitoreando

#### 6. **Detener Seguimiento**

- Al completar o rechazar una orden se detiene el rastreo GPS
- Se limpia el estado de forma segura
- Se puede reanudar si se aceptarta otra orden

#### 7. **Sincronización con Backend**

- Valida que las órdenes aún existan en el servidor
- Limpia datos obsoletos de AsyncStorage si la orden fue eliminada
- Re-autentica cuando hay expiración de token
- Redirige al login si sesión está expirada

#### 8. **Manejo de Errores**

- Manejo de errores de conexión
- Validación de permisos de ubicación
- Manejo de timeout en operaciones WebSocket
- Logging de errores en modo offline

### Estados Principales

- `orders`: Lista de órdenes de trabajo del usuario
- `loading`: Indicador de carga
- `takenOrderID`: ID de la orden actualmente activa
- `hideCompleted`: Filtro de órdenes completadas

### Procesos en Segundo Plano

- **Socket.IO**: Conexión WebSocket para actualizar GPS
- **TaskManager**: Tarea de fondo para rastreo de ubicación
- **Location API**: Actualización continua de coordenadas GPS

---

## 👤 Módulo: Mi Cuenta (my-account.tsx)

### Propósito

Permitir al usuario visualizar y modificar su información personal, cambiar contraseña y gestionar su perfil de usuario.

### Funcionalidades Principales

#### 1. **Carga de Datos del Usuario**

- Obtiene información del usuario desde AsyncStorage (guardada al login)
- Extrae datos guardados:
  - ID del usuario
  - Nombre completo (se separa en nombre y apellido)
  - Email
  - Tipo de usuario (user_type)
  - Token de acceso
- Muestra indicador de carga mientras se obtienen los datos

#### 2. **Sección de Datos Personales**

Formulario editable con campos:

- **Nombre**: Campo de texto editable
- **Apellido**: Campo de texto editable
- **Email**: Campo de texto editable con teclado de email
- **Tipo de Usuario**: Campo de solo lectura (muestra el tipo: admin, operador, etc.)

#### 3. **Actualizar Datos del Usuario**

- Botón "Actualizar Información"
- Valida que existan datos de usuario
- Envía solicitud POST a endpoint `/user/update`
- Payload incluye:
  - ID del usuario
  - Nombre completo (concatenado)
  - Email actualizado
- Muestra alerta de confirmación al completar
- Valida token de acceso antes de enviar

#### 4. **Sección de Cambio de Contraseña**

- Checkbox para activar/desactivar formulario de cambio
- Cuando está inactivo, se oculta el formulario
- Al activar, aparecen dos campos:
  - **Contraseña Actual**: Para verificar identidad
  - **Nueva Contraseña**: Para establecer nueva contraseña

#### 5. **Cambiar Contraseña**

- Valida que ambos campos estén completados
- Envía solicitud POST a endpoint `/user/change-password`
- Payload incluye:
  - ID del usuario
  - Contraseña antigua
  - Contraseña nueva
- Requiere autenticación con token de acceso
- Muestra confirmación o error según resultado

#### 6. **Gestión de Sesión**

- En caso de errores graves (datos de usuario no encontrados):
  - Limpia AsyncStorage de:
    - Datos de usuario (USER_DATA)
    - Token de acceso (ACCESS_TOKEN)
    - Orden de trabajo activa (WORK_ORDER_DATA)
    - Ruta activa (ROUTE_DATA)
  - Redirige al usuario a pantalla de login

#### 7. **Diseño y UX**

- Formularios con validación clara de campos
- Estilos adaptables a tema claro/oscuro
- Inputs con colores y bordes según tema
- Scroll para contenido que excede la pantalla
- KeyboardAvoidingView para no ocultar campos al escribir

### Estados Principales

- `userID`: ID del usuario actual
- `userName`: Nombre del usuario (editable)
- `userLastName`: Apellido del usuario (editable)
- `userEmail`: Email del usuario (editable)
- `oldPassword`: Contraseña actual (para validación)
- `newPassword`: Nueva contraseña a establecer
- `userType`: Tipo de usuario (solo lectura)
- `loading`: Indicador de carga inicial
- `passwordChangeAction`: Toggle para mostrar/ocultar formulario de contraseña
- `accessToken`: Token para autenticación de solicitudes

### Flujos de Error

- **Sin datos de usuario**: Muestra alerta y redirige a login
- **Sin token de acceso**: Muestra alerta y redirige a login
- **Campos vacíos**: Alerta de validación
- **Error de servidor**: Muestra mensaje de error con opción de reintento

---

## 🔄 Flujo General de la Aplicación

1. **Login**: Usuario se autentica → Se guardan datos en AsyncStorage
2. **Órdenes**: Usuario acepta una orden → Se cargan paraderos y formularios
3. **Paraderos**: Usuario navega paraderos → Puede seleccionar uno
4. **Formularios**: Usuario completa formularios en paraderos seleccionados
5. **GPS**: Mientras hay orden activa, se rastrea la ubicación constantemente
6. **Cuenta**: Usuario puede actualizar perfil e información en cualquier momento

---

## 🔐 Seguridad y Autenticación

- **Token JWT**: Se valida en cada solicitud al Backend
- **AsyncStorage**: Almacena datos locales de forma segura
- **Socket.IO**: Conexión autenticada para actualización de GPS
- **Validacion de Permisos**: iOS y Android requieren permisos explícitos para ubicación

---

## 📡 Endpoints Principales Utilizados

- `GET /bus-stops`: Obtener lista de paraderos
- `GET /visit-forms/user/:userId`: Obtener formularios del usuario
- `GET /work-orders/user/:userId`: Obtener órdenes del usuario
- `GET /routes/:routeID`: Obtener datos de una ruta
- `POST /user/update`: Actualizar información de usuario
- `POST /user/change-password`: Cambiar contraseña
- `WS /location-socket`: Socket para actualización de GPS en tiempo real
