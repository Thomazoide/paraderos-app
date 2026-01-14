import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import VisitFormComponent from '@/components/visit-form';
import { MAP_DEFAULT_CENTER } from '@/constants/center';
import { ROUTE_DATA, USER_DATA, WORK_ORDER_DATA } from '@/constants/client-data';
import { BACKEND_URL, ENDPOINTS } from '@/constants/endpoints';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BusStop, Route, User, WorkOrder } from '@/types/entitites';
import { ResponsePayload } from '@/types/response-payloads';
import { GetRequestConfig } from '@/utils/utilities';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CheckBox from "expo-checkbox";
import { router } from 'expo-router';
import { StarIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function BusStopsScreen() {
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapMode, setIsMapMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [routeData, setRouteData] = useState<Route>();
  const [showStopsFromRoute, setShowStopsFromRoute] = useState<boolean>(false);
  const [routeBusStops, setRouteBusStops] = useState<BusStop[] | null>(null);
  const [selectedBusStop, setSelectedBusStop] = useState<BusStop>();
  const [workOrderData, setWorkOrderData] = useState<WorkOrder>();
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const colorScheme = useColorScheme();

  const filteredBusStops = busStops.filter(stop => 
    stop.codigo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBusStopSelection = async (busStop: BusStop) => {
    if(!workOrderData || !routeData) {
      Alert.alert("Sin orden/ruta activa", "Debe tomar una orden para tener una ruta activa y completar formularios", [
        {
          text: "Ir a ordenes",
          onPress: () => router.replace("/(tabs)/orders")
        }
      ]);
    }
    try{
      const userDataString = await AsyncStorage.getItem(USER_DATA);
      if(!userDataString) throw new Error("NUD;Sin datos de usuario");
      const parsedUserData: User = JSON.parse(userDataString!);
      const incompletedAssigned = busStop.visitForms!.filter( (form) => (form.userId === parsedUserData.id) && (!form.completed) )
      if(incompletedAssigned.length > 0) throw new Error("MCF;Tiene formularios de este paradero sin completar");
      setSelectedBusStop(busStop);
    } catch(err) {
      const [errorCode, errorMessage] = (err as Error).message.split(";");
      if(errorCode === "NUD"){
        Alert.alert(errorMessage, "Debe iniciar sesión nuevamente...", [
          {
            text: "Volver a iniciar sesión",
            onPress: () => router.replace("/login")
          }
        ])
      } else if(errorCode === "MCF") {
        Alert.alert(errorMessage, "Debe completar los formularios existentes antes de crear otros",[
          {
            text: "Ir a Formularios",
            onPress: () => router.replace("/(tabs)/formularios")
          }
        ])
      } else {
        Alert.alert("Error desconocido", "Vuelva a cargar la aplicación o intentelo más tarde")
      }
    }
  }

  const cancelAction = () => {
    setSelectedBusStop(undefined);
  };

  const onRefresh = async () => {
    try {
      setIsRefreshing(true);
      const woData = await AsyncStorage.getItem(WORK_ORDER_DATA);
      const savedToken = await AsyncStorage.getItem("token");
      if(!savedToken) throw new Error("Sin token de acceso");
      const config = GetRequestConfig('GET', 'JSON', undefined, savedToken);
      const response = await fetch(`${BACKEND_URL}${ENDPOINTS.busStops}`, config);
      const data: ResponsePayload<BusStop[]> = await response.json();
      const cachedRouteData = await AsyncStorage.getItem(ROUTE_DATA);
      if(cachedRouteData && woData) {
        console.log(cachedRouteData);
        const parsedRouteData = JSON.parse(cachedRouteData) as Route;
        const parsedWorkOrderData = JSON.parse(woData) as WorkOrder;
        setWorkOrderData(parsedWorkOrderData);
        setRouteData(parsedRouteData);
      } else {
        await AsyncStorage.multiRemove([WORK_ORDER_DATA, ROUTE_DATA]);
        setWorkOrderData(undefined);
        setRouteData(undefined);
      }
      if (!response.ok) throw new Error(data.message || 'Error al obtener los paraderos');
      if(data.error) throw new Error(data.message);
      if(data.data) setBusStops(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    const fetchBusStops = async () => {
      try {
        setLoading(true);
        const woData = await AsyncStorage.getItem(WORK_ORDER_DATA);
        const savedToken = await AsyncStorage.getItem("token");
        if(!savedToken) throw new Error("Sin token de acceso");
        const config = GetRequestConfig('GET', 'JSON', undefined, savedToken);
        const response = await fetch(`${BACKEND_URL}${ENDPOINTS.busStops}`, config);
        const data: ResponsePayload<BusStop[]> = await response.json();
        const cachedRouteData = await AsyncStorage.getItem(ROUTE_DATA);
        if(cachedRouteData &&  woData) {
          const parsedRouteData = JSON.parse(cachedRouteData) as Route;
          const parsedWorkOrderData = JSON.parse(woData) as WorkOrder;
          setWorkOrderData(parsedWorkOrderData);
          setRouteData(parsedRouteData);
        } else {
          await AsyncStorage.multiRemove([WORK_ORDER_DATA, ROUTE_DATA]);
          setWorkOrderData(undefined);
          setRouteData(undefined);
        }
        if (!response.ok) {
          throw new Error(data.message || 'Error al obtener los paraderos');
        }

        if(data.error) throw new Error(data.message);
        if(data.data) setBusStops(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchBusStops();
  }, []);

  useEffect( () => {
    const filterPerRoute = () => {
      const persistentData = busStops;
      const routeIDS = new Set(Array.from(routeData!.route_points));
      const newList = persistentData.filter( (bs) => routeIDS.has(bs.id) );
      setRouteBusStops(newList);
    }
    if(showStopsFromRoute){
      filterPerRoute();
    } else {
      setRouteBusStops(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStopsFromRoute] );

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{error}</ThemedText>
      </ThemedView>
    );
  }

  
  const initialRegion = MAP_DEFAULT_CENTER;
  const theme = colorScheme ?? 'light';

  return (
     !selectedBusStop ? 
      <View style={styles.container}>
      {isMapMode ? (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={true}
        >
          {busStops.map((stop) => (
            <Marker
              key={stop.id}
              coordinate={{
                latitude: stop.lat,
                longitude: stop.lng,
              }}
              title={stop.codigo}
              description={stop.description}
            />
          ))}
        </MapView>
      ) : (
        <ThemedView style={styles.listContainer}>
          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.searchInput, { color: Colors[theme].text, borderColor: Colors[theme].icon }]}
              placeholder="Buscar por código (ej: PF89)"
              placeholderTextColor={Colors[theme].icon}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {
              routeData ?
              <View style={styles.checkboxContainer} >
                <CheckBox style={styles.checkbox} value={showStopsFromRoute} onValueChange={setShowStopsFromRoute} color={showStopsFromRoute ? Colors[theme].tint : undefined} /> 
                <ThemedText>Ver paraderos de la ruta activa</ThemedText>
              </View> : null
            }
          </View>
          <FlatList
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
            data={ routeBusStops ? routeBusStops : filteredBusStops}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[styles.item, { borderBottomColor: Colors[theme].icon }]}>
                <ThemedText type="subtitle"> {routeData && item.id === routeData.route_points.filter( (id) => id === item.id)[0] ? <StarIcon color={Colors[theme].text}/> : null} {item.codigo}</ThemedText>
                <ThemedText>{item.description}</ThemedText>
                <View style={styles.itemFooter}>
                  { !new Set(workOrderData?.stops_visited).has(item.id) ? <TouchableOpacity style={[styles.formButton, {backgroundColor: Colors[theme].tint}]} onPress={() => handleBusStopSelection(item)} >
                    <ThemedText style={[{color: Colors[theme].background, fontWeight: 'bold'}]}>
                      Crear formulario
                    </ThemedText>
                  </TouchableOpacity>
                  :
                  <ThemedText style={{
                    borderRadius: 8,
                    fontWeight: "bold",
                    padding: 5,
                  }} >
                    Paradero visitado y registrado!
                  </ThemedText>
                  }
                </View>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        </ThemedView>
      )}

      <TouchableOpacity 
        style={[styles.toggleButton, { backgroundColor: Colors[theme].tint }]} 
        onPress={() => setIsMapMode(!isMapMode)}
      >
        <ThemedText style={{ color: Colors[theme].background, fontWeight: 'bold' }}>
            {isMapMode ? 'Ver lista' : 'Ver mapa'}
        </ThemedText>
      </TouchableOpacity>
    </View>
    : workOrderData &&
    <VisitFormComponent busStop={selectedBusStop} status='start' workOrder={workOrderData} cancelAction={cancelAction} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 2,
    borderColor: "#bfbe24"
  },
  itemFooter: {
    padding: 10,
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  formButton: {
    padding: 5,
    borderRadius:10
  },
  checkboxContainer: {
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 2,
    alignContent: "center",
    alignItems: "center",
    marginTop: 10,
    borderBottomWidth: 0.5
  },
  checkbox: {
    margin: 8,
    borderRadius: 4
  },
  checkboxLabel: {
    fontSize: 16
  }
});
