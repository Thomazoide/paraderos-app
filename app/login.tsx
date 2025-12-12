import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BACKEND_URL, ENDPOINTS } from '@/constants/endpoints';
import { LoginPayload } from '@/types/request-payloads';
import { ResponsePayload } from '@/types/response-payloads';
import { GetRequestConfig } from '@/utils/utilities';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    setLoading(true);
    try {
      const payload: LoginPayload = { username, password };
      console.log('Intentando login en:', `${BACKEND_URL}${ENDPOINTS.authLogin}`);
      const response = await fetch(
        `${BACKEND_URL}${ENDPOINTS.authLogin}`,
        GetRequestConfig('POST', 'JSON', JSON.stringify(payload))
      );

      const data: ResponsePayload<string> = await response.json();

      if (data.error) {
        Alert.alert('Error', data.message || 'Error al iniciar sesión');
      } else if (data.data) {
        const token = data.data;
        await AsyncStorage.setItem('token', token);
        router.replace('/(tabs)/orders');
      } else {
        Alert.alert('Error', 'Respuesta inesperada del servidor');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Ocurrió un error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect( () => {
    const checkToken = async () => {
      const tokenExists = await AsyncStorage.getItem("token");
      if(tokenExists){
        router.replace("/(tabs)/orders");
      }
    }
    checkToken();
  }, [] );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Iniciar Sesión</ThemedText>
      
      <View style={styles.inputContainer}>
        <ThemedText style={styles.label}>Usuario</ThemedText>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Ingresa tu usuario"
          placeholderTextColor="#888"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.label}>Contraseña</ThemedText>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Ingresa tu contraseña"
          placeholderTextColor="#888"
          secureTextEntry
        />
      </View>

      <Button title={loading ? "Cargando..." : "Ingresar"} onPress={handleLogin} disabled={loading} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    color: '#000', // Ajustar según el tema si es necesario, pero por defecto negro para input básico
    backgroundColor: '#fff',
  },
});
