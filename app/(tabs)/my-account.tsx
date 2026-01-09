import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ACCESS_TOKEN, ROUTE_DATA, USER_DATA, WORK_ORDER_DATA } from "@/constants/client-data";
import { BACKEND_URL, ENDPOINTS } from "@/constants/endpoints";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme.web";
import { User, UserType } from "@/types/entitites";
import { UpdatePasswordInterface } from "@/types/request-payloads";
import { ResponsePayload } from "@/types/response-payloads";
import { GetRequestConfig } from "@/utils/utilities";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CheckBox from "expo-checkbox";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

export default function MyAccount() {

  const [userID, setUserID] = useState<number>(0);
  const [userName, setUserName] = useState<string>();
  const [userLastName, setUserLastName] = useState<string>();
  const [userEmail, setUserEmail] = useState<string>();
  const [accessToken, setAccessToken] = useState<string>()
  const [oldPassword, setOldPassword] = useState<string>();
  const [newPassword, setNewPassword] = useState<string>();
  const [userType, setUserType] = useState<UserType>();
  const [loading, setLoading] = useState<boolean>(true);
  const [passwordChangeAction, setPasswordChangeAction] = useState<boolean>(false);
  const colorSchemme = useColorScheme();
  const theme = colorSchemme ?? "light";
  const inputCommon = {
      color: Colors[theme].text,
      backgroundColor: theme === "light" ? "#F5F5F5" : "#2C2C2C",
      borderColor: Colors[theme].icon + "30"
  }

  const UpdateUserData = async () => {
    try {
      if(!userID) throw new Error("Sin datos de usuario...");
      const url = `${BACKEND_URL}${ENDPOINTS.userUpdate}`;
      if(!accessToken) throw new Error("Sin token de acceso...");
      const payload: Partial<User> = {
        id: userID,
        full_name: `${userName}${userLastName}`,
        email: userEmail,
      }
      const response = await (await fetch(url, GetRequestConfig("POST", "JSON", JSON.stringify(payload), accessToken))).json() as ResponsePayload<User>;
      if(response.error) throw new Error(response.message);
      Alert.alert("Completado", response.message, [
        {
          text: "Volver",
          onPress: () => router.navigate("/(tabs)/my-account")
        }
      ]);
    } catch (error) {
      Alert.alert((error as Error).message)
    }
  }

  const updatePassword = async () => {
    try {
      if(!userID) throw new Error("Sin datos de usuario...");
      if(!oldPassword || !newPassword) throw new Error("Debe rellenar los campos");
      const url = `${BACKEND_URL}${ENDPOINTS.userChangePassword}`;
      const payload: UpdatePasswordInterface = {
        oldPassword: oldPassword!,
        newPassword: newPassword!,
        id: userID
      };
      const response = await (await fetch(url, GetRequestConfig("POST", "JSON", JSON.stringify(payload), accessToken))).json() as ResponsePayload<boolean>;
      if(response.error) throw new Error(response.message);
      Alert.alert("Completado", response.message, [
        {
          text: "Volver",
          onPress: () => router.navigate("/(tabs)/my-account")
        }
      ]);
    } catch (error) {
      Alert.alert("Error", (error as Error).message, [
        {
          text: "Volver",
          onPress: () => router.navigate("/(tabs)/my-account")
        }
      ]);
    }
  }

  useEffect( () => {
    const GetUserData = async () => {
      try{
        const rawUserData = await AsyncStorage.getItem(USER_DATA);
        if(!rawUserData) throw new Error("NUD;Sin datos de usuario");
        const parsedUserData = JSON.parse(rawUserData) as User;
        const token = await AsyncStorage.getItem(ACCESS_TOKEN);
        if(!token) throw new Error("NAT;Sin token de acceso");
        setAccessToken(token);
        setUserID(parsedUserData.id);
        console.log(parsedUserData);
        const [name, lastName] = parsedUserData.full_name.split(" ");
        setUserName(name);
        setUserLastName(lastName);
        setUserEmail(parsedUserData.email);
        setUserType(parsedUserData.user_type);
      } catch (err) {
        const [errorCode, errorMessage] = (err as Error).message.split(";");
        if(errorCode === "NUD" || errorCode === "NAT") {
          Alert.alert(errorMessage, "Debe iniciar sesión nuevamente", [
            {
                text: "Ir a inicio",
                onPress: async () => {
                    await AsyncStorage.multiRemove([USER_DATA, WORK_ORDER_DATA, ROUTE_DATA, ACCESS_TOKEN]);
                    router.replace("/login");
                }
            }
          ]);
        }
        Alert.alert((err as Error).message, "Error desconocido, intente de nuevo más tarde");
      } finally {
          setLoading(false);
      }
    }
      GetUserData();
    }, [] );

    if(loading) {
        return (
            <ThemedView style={styles.loading}>
                <ActivityIndicator size="large" />
            </ThemedView>
        )
    }

    return (
        <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: Colors[theme].background }]}
        keyboardShouldPersistTaps="handled"
      >
        { !passwordChangeAction ? <ThemedView style={[styles.card, { borderColor: Colors[theme].icon + "30" }]}>
          <ThemedText type="title" style={styles.title}>Mi Cuenta</ThemedText>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Nombre</ThemedText>
            <TextInput
              style={[styles.input, inputCommon]}
              placeholder={userName || ""}
              placeholderTextColor={Colors[theme].icon}
              onChangeText={setUserName}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Apellido</ThemedText>
            <TextInput
              style={[styles.input, inputCommon]}
              placeholder={userLastName || ""}
              placeholderTextColor={Colors[theme].icon}
              onChangeText={setUserLastName}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <TextInput
              style={[styles.input, inputCommon]}
              placeholder={userEmail || ""}
              placeholderTextColor={Colors[theme].icon}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setUserEmail}
            />
          </View>

          <ThemedText style={styles.meta}>
            Tipo de usuario: <ThemedText style={styles.metaValue}>{userType}</ThemedText>
          </ThemedText>
        </ThemedView> : null}

        <ThemedView
          style={[
            styles.card,
            {
              borderColor: Colors[theme].icon + "30",
              marginTop: 8,
            },
          ]}
        >
          <View style={styles.checkboxRow}>
            <CheckBox style={styles.checkBox} value={passwordChangeAction} onValueChange={setPasswordChangeAction} color={ passwordChangeAction ? Colors[theme].tint : undefined } />
            <ThemedText style={styles.checkboxLabel}>Cambiar contraseña</ThemedText>
          </View>

          { passwordChangeAction ?
            <>
              <View style={styles.field}>
                <ThemedText style={styles.label}>Contraseña actual</ThemedText>
                <TextInput
                  style={[styles.input, inputCommon]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors[theme].icon}
                  secureTextEntry
                  onChangeText={setOldPassword}
                />
              </View>

              <View style={styles.field}>
                <ThemedText style={styles.label}>Nueva contraseña</ThemedText>
                <TextInput
                  style={[styles.input, inputCommon]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors[theme].icon}
                  secureTextEntry
                  onChangeText={setNewPassword}
                />
              </View>
            </>
            : null
          }
        </ThemedView>
        <ThemedView style={[
          styles.buttonRow,
          {
            borderColor: Colors[theme].icon + "30",
            marginTop: 8
          }
        ]}>
          <TouchableOpacity style={[
              styles.button,
              {
                backgroundColor: Colors[theme].tint
              }
            ]}
            onPress={ () => (passwordChangeAction ? updatePassword() : UpdateUserData()) }
          >
            <ThemedText style={{
              color: Colors[theme].background
            }}>Actualizar datos</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    container: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingVertical: 20
    },
    card: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        elevation: 1
    },
    title: {
        marginBottom: 12
    },
    field: {
        marginBottom: 12
    },
    label: {
        marginBottom: 6,
        fontWeight: "600"
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: Platform.select({
            ios: 10,
            android: 8,
            default: 8
        }),
        fontSize: 16
    },
    meta: {
        marginTop: 4,
        color: ""
    },
    metaValue: {
        fontWeight: "600"
    },
    checkboxRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12
    },
    checkboxLabel: {
        marginLeft: 8
    },
    checkBox: {
        marginRight: 8,
        borderRadius: 4
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "space-evenly",
      padding: 16,
      borderWidth: 1,
      borderRadius: 12,
      elevation: 1
    },
    button: {
      padding: 8,
      borderRadius: 12,
      elevation: 2
    }
})