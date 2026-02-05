import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  ACCESS_TOKEN,
  LOCATION_BACKGROUND_TASK,
  ROUTE_DATA,
  USER_DATA,
  WORK_ORDER_DATA,
} from "@/constants/client-data";
import { BACKEND_URL, ENDPOINTS } from "@/constants/endpoints";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Route, User, WorkOrder } from "@/types/entitites";
import { UpdatePositionPayload } from "@/types/request-payloads";
import { ResponsePayload } from "@/types/response-payloads";
import { FormatDate, GetRequestConfig } from "@/utils/utilities";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Checkbox } from "expo-checkbox";
import {
  Accuracy,
  LocationObject,
  hasStartedLocationUpdatesAsync,
  requestBackgroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
} from "expo-location";
import { router } from "expo-router";
import * as TaskManager from "expo-task-manager";
import { jwtDecode } from "jwt-decode";
import { StarIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { io } from "socket.io-client";

TaskManager.defineTask(LOCATION_BACKGROUND_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Proceso de tarea en segundo plano fallido...", error);
    return;
  }
  const { locations } = (data ?? {}) as { locations?: LocationObject[] };
  const loc = locations?.[0];
  if (!loc) return;
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN);
    const userDataRaw = await AsyncStorage.getItem(USER_DATA);
    const userID = userDataRaw
      ? (JSON.parse(userDataRaw) as User).id
      : undefined;
    if (!token || !userID) {
      console.log(
        "Sin datos de usuario ni token de acceso, procediendo offline...",
      );
      return;
    }
    const socket = io(`${BACKEND_URL}${ENDPOINTS.locationSocket}`, {
      transports: ["websocket"],
      auth: { token },
      forceNew: true,
      reconnection: true,
      timeout: 4000,
    });
    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        const payload: UpdatePositionPayload = {
          id: userID!,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: new Date().toISOString(),
        };
        socket.emit("actualizar-gps", payload, () => {
          resolve();
        });
      };
      socket.once("connect", onConnect);
      socket.once("connect_error", reject);
      setTimeout(() => reject(new Error("Tiempo de espera agotado...")), 4500);
    });
    socket.disconnect();
  } catch (err) {
    console.log("Conexión por socket fallida...", err);
  }
});

export const startLocationTracking = async () => {
  const { status: fg } = await requestForegroundPermissionsAsync();
  if (fg !== "granted") {
    Alert.alert(
      "Permiso requerido",
      "Otorga acceso a la ubicación mientras usas la app",
    );
    return;
  }
  const { status: bg } = await requestBackgroundPermissionsAsync();
  if (bg !== "granted") {
    Alert.alert(
      "Permiso requerido",
      "otorga acceso a la ubicación en segundo plano",
    );
    return;
  }
  const already = await hasStartedLocationUpdatesAsync(
    LOCATION_BACKGROUND_TASK,
  );
  if (already) return;
  await startLocationUpdatesAsync(LOCATION_BACKGROUND_TASK, {
    accuracy: Accuracy.High,
    distanceInterval: 15,
    timeInterval: 10000,
    deferredUpdatesInterval: 5000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Ruta en curso",
      notificationBody: "Monitorenado tu ubicación para la orden asignada",
      notificationColor: "#ffffff",
    },
  });
};

export const stopLocationTracking = async () => {
  const started = await hasStartedLocationUpdatesAsync(
    LOCATION_BACKGROUND_TASK,
  );
  if (started) await stopLocationUpdatesAsync(LOCATION_BACKGROUND_TASK);
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [takenOrderID, setTakenOrderID] = useState<number>(0);
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? "light";

  const uncompletedOrders = orders.filter((o) => !o.completada);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem(ACCESS_TOKEN);
      const wo_str = await AsyncStorage.getItem(WORK_ORDER_DATA); //JSON stringificado de datos guardados del lado del cliente sobre una orden de trabajo previamente puesta como activa
      if (!token) throw new Error("Sin token de acceso");
      const decoded: Partial<User> = jwtDecode(token);
      const response = await fetch(
        `${BACKEND_URL}${ENDPOINTS.workOrdersByUserID(decoded.id!)}`,
        GetRequestConfig("GET", "JSON", undefined, token),
      );
      const data: ResponsePayload<WorkOrder[]> = await response.json();
      if (!data.data || data.data!.length === 0)
        AsyncStorage.multiRemove([WORK_ORDER_DATA, ROUTE_DATA]);
      if (data.error) throw new Error(data.message);
      if (wo_str) {
        const parsedWO = JSON.parse(wo_str) as WorkOrder;
        const woID = parsedWO.id;
        const woExists = data.data!.filter((wo) => wo.id === woID)[0];
        if (!woExists)
          await AsyncStorage.multiRemove([WORK_ORDER_DATA, ROUTE_DATA]);
      }
      setOrders(data.data!);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "error de conexion",
      );
      if (error instanceof Error && error.message === "Unauthorized") {
        AsyncStorage.multiRemove([
          ACCESS_TOKEN,
          USER_DATA,
          WORK_ORDER_DATA,
          ROUTE_DATA,
        ]);
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRoute = async (routeID: number) => {
    try {
      const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN);
      if (!accessToken) throw new Error("Sesión expirada");
      const endpoint = `${BACKEND_URL}${ENDPOINTS.routeByID(routeID)}`;
      const config = GetRequestConfig("GET", "JSON", undefined, accessToken);
      const response = (await (
        await fetch(endpoint, config)
      ).json()) as ResponsePayload<Route>;
      if (response.error) throw new Error(response.message);
      AsyncStorage.setItem(ROUTE_DATA, JSON.stringify(response.data));
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    }
  };

  useEffect(() => {
    const checkTakenOrder = async () => {
      const strData = await AsyncStorage.getItem(WORK_ORDER_DATA);
      if (!strData) return;
      const takenOrder = JSON.parse(strData) as WorkOrder;
      setTakenOrderID(takenOrder.id);
      return;
    };
    checkTakenOrder();
    fetchOrders();
  }, []);

  const handleTakeOrder = async (workOrder: WorkOrder) => {
    try {
      const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN);
      const userDataExists = await AsyncStorage.getItem(USER_DATA);
      if (!userDataExists)
        throw new Error(
          "Sin datos de usuario, se recomienda iniciar sesion nuevamente",
        );
      if (!accessToken) throw new Error("Sesión expirada");
      await AsyncStorage.setItem(WORK_ORDER_DATA, JSON.stringify(workOrder));
      await fetchRoute(workOrder.route_id!);
      await startLocationTracking();
      Alert.alert(
        `Órden #${workOrder.id} activa`,
        "Solo puede tener una órden activa a la vez",
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Error desconocido",
      );
    }
  };

  const renderItem = ({ item }: { item: WorkOrder }) => {
    const visitedString = `Paraderos visitados: ${item.stops_visited?.length} de ${item.route?.route_points.length}`;

    return (
      <ThemedView style={[styles.card]}>
        <ThemedView style={styles.cardTitle}>
          <ThemedText type="subtitle">Orden #{item.id}</ThemedText>
          {takenOrderID === item.id && <StarIcon color={Colors[theme].icon} />}
        </ThemedView>
        <ThemedText>
          Estado:{" "}
          <ThemedText
            style={item.completada ? { color: "green" } : { color: "orange" }}
          >
            {" "}
            {item.completada ? "Completada" : "Pendiente"}{" "}
          </ThemedText>{" "}
        </ThemedText>
        <ThemedText>Ruta ID: {item.route_id}</ThemedText>
        <ThemedText>
          {item.route && item.stops_visited ? visitedString : null}
        </ThemedText>
        <ThemedText>
          Fecha de creación: {"\n"} {FormatDate(item.creation_date)}
        </ThemedText>
        {item.complete_date && (
          <ThemedText>
            Fecha de cierre: {"\n"} {FormatDate(item.complete_date)}
          </ThemedText>
        )}
        {!item.completada && (
          <Button
            title={
              takenOrderID === item.id
                ? "Orden activa"
                : "Establecer como la orden activa"
            }
            disabled={takenOrderID === item.id}
            onPress={() => handleTakeOrder(item)}
          />
        )}
      </ThemedView>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Órdenes de Trabajo
      </ThemedText>
      <ThemedView style={styles.hideCompletedBox}>
        <Checkbox
          style={styles.checkbox}
          value={hideCompleted}
          onValueChange={setHideCompleted}
          color={hideCompleted ? Colors[theme].tint : undefined}
        />
        <ThemedText>Ocultar completadas</ThemedText>
      </ThemedView>
      <FlatList
        data={!hideCompleted ? orders : uncompletedOrders}
        renderItem={(item) => renderItem(item)}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<ThemedText>No hay órdenes disponibles</ThemedText>}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchOrders} />
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    textAlign: "center",
    marginVertical: 20,
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    elevation: 3,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
  },
  cardTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  hideCompletedBox: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginBottom: 10,
    gap: 5,
  },
  checkbox: {
    borderRadius: 4,
  },
});
