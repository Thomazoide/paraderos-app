import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCESS_TOKEN, ROUTE_DATA, USER_DATA, WORK_ORDER_DATA } from '@/constants/client-data';
import { BACKEND_URL, ENDPOINTS } from '@/constants/endpoints';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Route, User, WorkOrder } from '@/types/entitites';
import { ResponsePayload } from '@/types/response-payloads';
import { GetRequestConfig } from '@/utils/utilities';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import { StarIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, StyleSheet, View } from 'react-native';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [hasOrderAssigned, setHasOrderAssigned] = useState<boolean>(false);
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
        const assignedOrders = data.data.filter( (o) => o.user_id === decoded.id && !o.completada );
        if(assignedOrders.length > 0) {
          await AsyncStorage.setItem(WORK_ORDER_DATA, JSON.stringify(assignedOrders[0]));
          if(assignedOrders[0].route){
            await AsyncStorage.setItem(ROUTE_DATA, JSON.stringify(assignedOrders[0].route));
          } else {
            const endpoint = `${BACKEND_URL}${ENDPOINTS.routes}`;
            const response = await (await fetch(endpoint, GetRequestConfig("GET", "JSON", undefined, token))).json() as ResponsePayload<Route>;
            if(response.error) throw new Error(response.message);
            if(response.data) await AsyncStorage.setItem(ROUTE_DATA, JSON.stringify(response.data));
          }
          setHasOrderAssigned(true);
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
      Alert.alert("Orden asignada", "No podra tomar mas ordenes hasta haber terminado la asiganda");
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
      
    }

  };

  const renderItem = ({ item }: { item: WorkOrder }) => {
    const isAssignedToMe = item.user_id === userId;
    const isUnassigned = item.user_id === null;

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
        
        {isUnassigned && !isAssignedToMe && !hasOrderAssigned && (
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
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: 'rgba(255,255,255,0.1)', // Slight background for visibility
  },
  cardTitle: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
