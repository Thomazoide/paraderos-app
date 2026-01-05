import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCESS_TOKEN, LOCATION_BACKGROUND_TASK, ROUTE_DATA, USER_DATA, WORK_ORDER_DATA } from '@/constants/client-data';
import { BACKEND_URL, ENDPOINTS } from '@/constants/endpoints';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Route, User, WorkOrder } from '@/types/entitites';
import { UpdatePositionPayload } from '@/types/request-payloads';
import { ResponsePayload } from '@/types/response-payloads';
import { GetRequestConfig } from '@/utils/utilities';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accuracy, LocationObject, hasStartedLocationUpdatesAsync, requestBackgroundPermissionsAsync, requestForegroundPermissionsAsync, startLocationUpdatesAsync, stopLocationUpdatesAsync } from "expo-location";
import { router } from 'expo-router';
import * as TaskManager from "expo-task-manager";
import { jwtDecode } from 'jwt-decode';
import { StarIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { io } from "socket.io-client";

TaskManager.defineTask(LOCATION_BACKGROUND_TASK, async ({ data, error }) => {
  if(error) {
    console.error("Proceso de tarea en segundo plano fallido...", error);
    return;
  }
  const { locations } = (data ?? {}) as { locations?: LocationObject[]};
  const loc = locations?.[0];
  if(!loc) return;
  try {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN);
    const userDataRaw = await AsyncStorage.getItem(USER_DATA);
    const userID = userDataRaw ? (JSON.parse(userDataRaw) as User).id : undefined;
    if(!token || !userID){
      console.log("Sin datos de usuario ni token de acceso, procediendo offline...");
      return;
    }
    const socket = io(`${BACKEND_URL}${ENDPOINTS.locationSocket}`, {
      transports: ["websocket"],
      auth: {token},
      forceNew: true,
      reconnection: true,
      timeout: 4000
    });
    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        const payload: UpdatePositionPayload = {
          id: userID!,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: new Date().toISOString()
        };
        socket.emit("actualizar-gps", payload, () => {
          resolve();
        });
      };
      socket.once("connect", onConnect);
      socket.once("connect_error", reject);
      setTimeout( () => reject(new Error("Tiempo de espera agotado...")), 4500);
    });
    socket.disconnect();
  } catch (err) {
    console.log("Conexión por socket fallida...", err);
  }
});

export const startLocationTracking = async () => {
  const {status: fg} = await requestForegroundPermissionsAsync();
  if(fg !== "granted") {
    Alert.alert("Permiso requerido", "Otorga acceso a la ubicación mientras usas la app");
    return;
  }
  const {status: bg} = await requestBackgroundPermissionsAsync();
  if(bg !== "granted") {
    Alert.alert("Permiso requerido", "otorga acceso a la ubicación en segundo plano");
    return;
  }
  const already = await hasStartedLocationUpdatesAsync(LOCATION_BACKGROUND_TASK);
  if(already) return;
  await startLocationUpdatesAsync(LOCATION_BACKGROUND_TASK, {
    accuracy: Accuracy.High,
    distanceInterval: 15,
    timeInterval: 10000,
    deferredUpdatesInterval: 5000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Ruta en curso",
      notificationBody: "Monitorenado tu ubicación para la orden asignada",
      notificationColor: "#ffffff"
    }
  });
};

export const stopLocationTracking = async () => {
  const started = await hasStartedLocationUpdatesAsync(LOCATION_BACKGROUND_TASK);
  if(started) await stopLocationUpdatesAsync(LOCATION_BACKGROUND_TASK);
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const colorScheme = useColorScheme()
  const theme = colorScheme ?? "light";

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded: Partial<User> = jwtDecode(token);
      setUserId(decoded.id!);

      const response = await fetch(
        `${BACKEND_URL}${ENDPOINTS.workOrders}`,
        GetRequestConfig('GET', 'JSON', undefined, token)
      );
      const data: ResponsePayload<WorkOrder[]> = await response.json();
      
      if (!data.error && data.data) {
        setOrders(data.data);
        await startLocationTracking();
        const assignedOrders = data.data.filter( (o) => (!o.completada && o.user_id === decoded.id) );
        if(assignedOrders.length > 0) {
          console.log(assignedOrders);
          await AsyncStorage.setItem(WORK_ORDER_DATA, JSON.stringify(assignedOrders[0]));
          if(assignedOrders[0].route){
            await AsyncStorage.setItem(ROUTE_DATA, JSON.stringify(assignedOrders[0].route));
          } else {
            const endpoint = `${BACKEND_URL}${ENDPOINTS.routes}`;
            const response = await (await fetch(endpoint, GetRequestConfig("GET", "JSON", undefined, token))).json() as ResponsePayload<Route>;
            if(response.error) throw new Error(response.message);
            if(response.data) await AsyncStorage.setItem(ROUTE_DATA, JSON.stringify(response.data));
          }
        } else {
          await AsyncStorage.multiRemove([WORK_ORDER_DATA, ROUTE_DATA]);
        }
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', (error as Error).message || "error de conexion");
      if((error as Error).message === "Unauthorized"){
        AsyncStorage.setItem(ACCESS_TOKEN, "");
        AsyncStorage.setItem(USER_DATA, "");
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRoute = async (workOrder: WorkOrder) => {
    try {
      const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN);
      if(!accessToken) throw new Error("Sesión expirada");
      const endpoint = `${BACKEND_URL}${ENDPOINTS.routeByID(workOrder.route_id!)}`;
      const config = GetRequestConfig("GET", "JSON", undefined, accessToken);
      const response = await (await fetch(endpoint, config)).json() as ResponsePayload<Route>;
      if(response.error) throw new Error(response.message);
      AsyncStorage.setItem(WORK_ORDER_DATA, JSON.stringify(workOrder));
      AsyncStorage.setItem(ROUTE_DATA, JSON.stringify(response.data));
      await fetchOrders();
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    }
  }

  

  useEffect( () => {
    fetchOrders();
  }, [] );

  const handleTakeOrder = async (workOrder: WorkOrder) => {
    try {
      //Obtener token de acceso
      const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN);
      const userDataExists = await AsyncStorage.getItem(USER_DATA);
      if(!userDataExists) throw new Error("Sin datos de usuario, se recomienda iniciar sesion nuevamente");
      const userData = JSON.parse(userDataExists!) as Partial<User>;
      if(!accessToken) throw new Error("Sesión expirada");
      //Guardar los datos asincronos
      const updatedWO = workOrder;
      updatedWO.user_id = userData.id!;
      //Actualizar los datos de la ot en bbdd para que sea asgnada a un usuario de terreno
      const endpoint = `${BACKEND_URL}${ENDPOINTS.workOrders}`;
      const config = GetRequestConfig("POST", "JSON", JSON.stringify(updatedWO), accessToken);
      const response = await (await fetch(endpoint, config)).json() as ResponsePayload<WorkOrder>;
      if(response.error) throw new Error(response.message);
      await fetchRoute(response.data!);
      await startLocationTracking();
      Alert.alert("Orden asignada", "No podra tomar mas ordenes hasta haber terminado la asiganda");
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
      
    }

  };

  const renderItem = ({ item }: { item: WorkOrder }) => {
    const isAssignedToMe = item.user_id === userId;
    const isUnassigned = item.user_id === null;
    const visitedString = `Paraderos visitados: ${item.stops_visited?.length} de ${item.route?.route_points.length}`

    return (
      <View style={styles.card}>
        <View style={styles.cardTitle} >
          <ThemedText type="subtitle">Orden #{item.id}</ThemedText>
          {
            isAssignedToMe &&
            <StarIcon color={Colors[theme].icon} />
          }
        </View>
        <ThemedText>Estado: {item.completada ? 'Completada' : 'Pendiente'}</ThemedText>
        <ThemedText>Ruta ID: {item.route_id}</ThemedText>
        <ThemedText>{ item.route && item.stops_visited ? visitedString : null}</ThemedText>
        {isUnassigned && !isAssignedToMe && (
          <Button title="Tomar orden" onPress={() => handleTakeOrder(item)} />
        )}
      </View>
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
      <ThemedText type="title" style={styles.title}>Órdenes de Trabajo</ThemedText>
      <FlatList
        data={orders}
        renderItem={renderItem}
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
    textAlign: 'center',
    marginVertical: 20,
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 2
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
  },
  cardTitle: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
