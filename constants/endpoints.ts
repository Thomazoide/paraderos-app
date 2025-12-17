export const ENDPOINTS = {
    authLogin: "/auth/v1/login", // POST
    authVerifyToken: "/auth/v1/verificar-token", // POST
    busStops: "/paraderos/v1", // solo GET y POST
    busStopFindOrDelete: (id: number) => `/paraderos/v1/find/${id}`, // solo GET o DELETE
    departures: "/salidas/v1", // solo GET y POST
    departuresByUserID: (id: number) => `/salidas/v1/usuario/${id}`, // GET
    departuresByBusStopID: (id: number) => `/salidas/v1/paradero/${id}`, // GET
    entries: "/entradas/v1", // solo GET y POST
    entriesByUserID: (id: number) => `/entradas/v1/usuario/${id}`, // GET
    entriesByBusStopID: (id: number) => `/entradas/v1/paradero/${id}`, // GET
    workOrders: "/ordenes/v1", // GET y POST
    workOrderByID: (id: number) => `/ordenes/v1/buscar/${id}`, // GET
    workOrderByRouteID: (id: number) => `/ordenes/v1/ruta/${id}`, // GET
    deleteWorkOrder: (id: number) => `/ordenes/v1/borrar/${id}`, // DELETE
    routes: "/rutas/v1", // GET y POST
    routeByID: (id: number) => `/rutas/v1/find/${id}`, // GET
    routeByOrderID: (id: number) => `/rutas/v1/orden/${id}`, // GET
    users: "/usuarios/v1", // GET
    userCreate: "/usuarios/v1/registrar", // POST
    userUpdate: "/usuarios/v1/actualizar", // POST
    userChangePassword: "/usuarios/actualizar/clave", // POST
    visitForms: "/formularios/v1", // GET
    visitFormCreate: "/formularios/v1/crear", // POST
    visitFormFinish: (id: number) => `/formularios/v1/cerrar/${id}`, // POST
    visitFormByRouteID: (id: number) => `/formularios/v1/ruta/${id}`, // GET
    visitFormByUserID: (id: number) => `/formularios/v1/usuario/${id}` // GET
};
export const BACKEND_URL = "http://192.168.1.2:3000";