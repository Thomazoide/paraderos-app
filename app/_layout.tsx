import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Background watchdog imports
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import { Accuracy, getCurrentPositionAsync, hasStartedLocationUpdatesAsync, startLocationUpdatesAsync } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { io } from 'socket.io-client';

import { ACCESS_TOKEN, LOCATION_BACKGROUND_TASK, USER_DATA, WORK_ORDER_DATA } from '@/constants/client-data';
import { BACKEND_URL, ENDPOINTS } from '@/constants/endpoints';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { User, WorkOrder } from '@/types/entitites';
import type { UpdatePositionPayload } from '@/types/request-payloads';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Define a lightweight watchdog task to ensure location updates stay active
const LOCATION_WATCHDOG_TASK = 'location-watchdog';

TaskManager.defineTask(LOCATION_WATCHDOG_TASK, async () => {
  try {
    const woRaw = await AsyncStorage.getItem(WORK_ORDER_DATA);
    const wo: WorkOrder | null = woRaw ? JSON.parse(woRaw) : null;
    // If there's no active work order, do nothing
    if (!wo || (wo as WorkOrder).completada) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    // Ensure background location updates are running
    const started = await hasStartedLocationUpdatesAsync(LOCATION_BACKGROUND_TASK);
    if (!started) {
      await startLocationUpdatesAsync(LOCATION_BACKGROUND_TASK, {
        accuracy: Accuracy.High,
        distanceInterval: 15,
        timeInterval: 10000,
        deferredUpdatesInterval: 5000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Ruta en curso',
          notificationBody: 'Monitoreando tu ubicación para la orden asignada',
          notificationColor: '#ffffff',
        },
      });
    }

    // Optional heartbeat: one-shot position emit via socket
    try {
      const pos = await getCurrentPositionAsync({ accuracy: Accuracy.Balanced });
      const token = await AsyncStorage.getItem(ACCESS_TOKEN);
      const userDataRaw = await AsyncStorage.getItem(USER_DATA);
      const userID = userDataRaw ? (JSON.parse(userDataRaw) as Partial<User>).id : undefined;
      if (token && userID && pos) {
        const socket = io(`${BACKEND_URL}${ENDPOINTS.locationSocket}`, {
          transports: ['websocket'],
          auth: { token },
          forceNew: true,
          reconnection: false,
          timeout: 4000,
        });
        await new Promise<void>((resolve, reject) => {
          socket.once('connect', () => {
            const payload: UpdatePositionPayload = {
              id: userID!,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              timestamp: new Date().toISOString(),
            };
            socket.emit('actualizar-gps', payload, () => resolve());
          });
          socket.once('connect_error', reject);
          setTimeout(() => reject(new Error('Socket connect timeout')), 4500);
        });
        socket.disconnect();
      }
    } catch {
      // swallow heartbeat errors; watchdog must be resilient
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.log('Watchdog task error:', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

const ensureBackgroundTaskRegistered = async () => {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    await BackgroundTask.registerTaskAsync(LOCATION_WATCHDOG_TASK, {
      minimumInterval: 30, // minutes; system enforces platform-specific minimums
    });
    if (Platform.OS === 'ios') {
      BackgroundTask.addExpirationListener(() => {
        // iOS may expire tasks; no-op hook to allow cleanup if needed
      });
    }
    if (__DEV__) {
      // Useful for local testing in dev clients (not Expo Go)
      try { await BackgroundTask.triggerTaskWorkerForTestingAsync(); } catch {}
    }
  } catch (e) {
    console.log('No se pudo registrar el watchdog:', e);
  }
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a7ea4' }} edges={['top']}>
        <View style={{ flex: 1, backgroundColor: Colors[theme].background }}>
          {/** Register background watchdog on app start */}
          <RegisterWatchdog />
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </View>
        <StatusBar style="light" backgroundColor="#0a7ea4" />
      </SafeAreaView>
    </ThemeProvider>
  );
}

function RegisterWatchdog() {
  useEffect(() => {
    // Kick off registration once on app load
    ensureBackgroundTaskRegistered();
  }, []);
  return null;
}
