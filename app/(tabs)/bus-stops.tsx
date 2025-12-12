import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MAP_DEFAULT_CENTER } from '@/constants/center';
import { BACKEND_URL, ENDPOINTS } from '@/constants/endpoints';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BusStop } from '@/types/entitites';
import { ResponsePayload } from '@/types/response-payloads';
import { GetRequestConfig } from '@/utils/utilities';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function BusStopsScreen() {
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapMode, setIsMapMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const colorScheme = useColorScheme();

  const filteredBusStops = busStops.filter(stop => 
    stop.codigo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchBusStops = async () => {
      try {
        const savedToken = await AsyncStorage.getItem("token");
        if(!savedToken) throw new Error("Sin token de acceso");
        const config = GetRequestConfig('GET', 'JSON', undefined, savedToken);
        const response = await fetch(`${BACKEND_URL}${ENDPOINTS.busStops}`, config);
        const data: ResponsePayload<BusStop[]> = await response.json();
        console.log(data);

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
          </View>
          <FlatList
            data={filteredBusStops}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[styles.item, { borderBottomColor: Colors[theme].icon }]}>
                <ThemedText type="subtitle">{item.codigo}</ThemedText>
                <ThemedText>{item.description}</ThemedText>
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
  },
});
