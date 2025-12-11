import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BACKEND_URL, ENDPOINTS } from '@/constants/endpoints';
import { WorkOrder } from '@/types/entitites';
import { ResponsePayload } from '@/types/response-payloads';
import { GetRequestConfig } from '@/utils/utilities';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, StyleSheet, View } from 'react-native';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decoded: any = jwtDecode(token);
      // Asumiendo que el ID del usuario viene como 'id' o 'user_id' en el token.
      // Ajustar según la estructura real del token.
      setUserId(decoded.id || decoded.user_id);

      const response = await fetch(
        `${BACKEND_URL}${ENDPOINTS.workOrders}`,
        GetRequestConfig('GET', 'JSON', undefined, token)
      );
      const data: ResponsePayload<WorkOrder[]> = await response.json();
      
      if (!data.error && data.data) {
        setOrders(data.data);
      } else {
        Alert.alert('Error', data.message || 'Error al obtener órdenes');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const handleTakeOrder = async (orderId: number) => {
    Alert.alert('Info', 'Funcionalidad de tomar orden pendiente de implementar');
  };

  const renderItem = ({ item }: { item: WorkOrder }) => {
    const isAssignedToMe = item.user_id === userId;
    const isUnassigned = item.user_id === null;

    // Filtrar: mostrar si está asignada a mí o si no está asignada
    if (!isAssignedToMe && !isUnassigned) return null;

    return (
      <View style={styles.card}>
        <ThemedText type="subtitle">Orden #{item.id}</ThemedText>
        <ThemedText>Estado: {item.completada ? 'Completada' : 'Pendiente'}</ThemedText>
        <ThemedText>Ruta ID: {item.route_id}</ThemedText>
        
        {isUnassigned && (
          <Button title="Tomar orden" onPress={() => handleTakeOrder(item.id)} />
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
});
