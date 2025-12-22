import { ACCESS_TOKEN, ROUTE_DATA, USER_DATA } from "@/constants/client-data";
import { BACKEND_URL, ENDPOINTS } from "@/constants/endpoints";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BusStop, Route, User, VisitForm, WorkOrder } from "@/types/entitites";
import { ResponsePayload } from "@/types/response-payloads";
import { GetRequestConfig } from "@/utils/utilities";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Camera, CircleOff, Text } from "lucide-react-native";
import { useRef, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export default function VisitFormComponent(props: {busStop: BusStop, workOrder: WorkOrder, status: "start" | "finish", formID?: number, cancelAction: () => void}) {
    const [facing, setFacing] = useState<CameraType>("back");
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView | null>(null);
    const [picData, setPicData] = useState<string>();
    const [loading, setLoading] = useState<boolean>(false);
    const [textInputData, setTextInputData] = useState<string>();
    const colorScheme = useColorScheme();
    const theme = colorScheme ?? "light";
    const toggleCameraFacing = () => {
        setFacing(current => (current === "back" ? "front" : "back"));
    };
    const takePicture = async () => {
        if(cameraRef.current){
            const picture = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.3,
                skipProcessing: false
            });
            setPicData(picture.base64!)
        }
    }

    const SaveFirstPartOfForm = async () => {
        try{
            setLoading(true);
            if(!textInputData && !cameraRef.current){
                Alert.alert("Sin datos!", "Debe rellenar con una descripción y tomar una foto obligatoriamente...");
                setLoading(false);
                return;
            }
            const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN);
            if(!accessToken) {
                Alert.alert("Sesión expirada", "No se ha encontrado el token de acceso...\nInicie sesion nuevamente", [
                    {
                        text: "Ir a iniciar sesión",
                        onPress: () => router.replace("/login")
                    }
                ]);
            }
            const routeStringifiedData = await AsyncStorage.getItem(ROUTE_DATA);
            if(!routeStringifiedData) {
                Alert.alert("Sin datos de ruta", "Probablemente deba tomar una orden nueva...", [
                    {
                        text: "Ir a órdenes",
                        onPress: () => router.replace("/(tabs)/orders")
                    }
                ]);
            }
            const parsedRouteData: Route = JSON.parse(routeStringifiedData!);
            const stringifiedUserData = await AsyncStorage.getItem(USER_DATA);
            if(!stringifiedUserData) {
                Alert.alert("Sin datos de usuario", "Debe iniciar sesión nuevamente", [
                    {
                        text: "Ir a iniciar sesión",
                        onPress: () => router.replace("/login")
                    }
                ]);
            }
            const parsedUserData: User = JSON.parse(stringifiedUserData!);
            const payload: Partial<VisitForm> = {
                busStop: props.busStop,
                busStopId: props.busStop.id,
                creation_date: new Date().toISOString(),
                completed: false,
                description: textInputData,
                picBeforeURL: picData,
                route: parsedRouteData,
                routeId: parsedRouteData.id,
                user: parsedUserData,
                userId: parsedUserData.id
            }
            const config = GetRequestConfig("POST", "JSON", JSON.stringify(payload), accessToken!);
            const endpoint = `${BACKEND_URL}${ENDPOINTS.visitFormCreate}`;
            const response = await (await fetch(endpoint, config)).json() as ResponsePayload<VisitForm>;
            if(response.error) throw new Error(response.message);
            Alert.alert("Formulario creado", `Formulario #${response.data!.id} creado con exito.\nPara finalizarlo debe buscarlo en la pestaña de formularios`, [
                {
                    text: "Volver",
                    onPress: () => router.replace("/(tabs)/bus-stops")
                },
                {
                    text: "Ir a formularios",
                    onPress: () => router.replace("/(tabs)/formularios")
                }
            ])
        } catch(err) {
            Alert.alert("Error en la petición", (err as Error).message, [
                {
                    text: "Continuar",
                    onPress: () => router.replace("/(tabs)/bus-stops")
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const saveLastPartOfForm = async () => {
        try {
            setLoading(true);
            const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN);
            if(!accessToken) {
                Alert.alert("Sin token de acceso", "Debe iniciar sesión nuevamente...",
                    [
                        {
                            text: "Continuar",
                            onPress: () => router.replace("/login")
                        }
                    ]
                );
            }
            if(!textInputData && !picData) {
                Alert.alert("sin datos!", "Debe llenar el campo de descripcion y tomar una foto obligatoriamente");
                setLoading(false);
                return;
            }
            const payload = {
                id: props.formID,
                commentP2: textInputData,
                picStr: picData
            }
            const endpoint = `${BACKEND_URL}${ENDPOINTS.visitFormFinish}`;
            const config = GetRequestConfig("POST", "JSON", JSON.stringify(payload), accessToken!);
            const response: ResponsePayload<VisitForm> = await (await fetch(endpoint, config)).json();
            if(response.error) throw new Error(response.message);
            Alert.alert("Formulario cerrado", "El formulario ha sido cerrado exitosamente",
                [
                    {
                        text: "Continuar",
                        onPress: () => router.replace("/(tabs)/formularios")
                    }
                ]
            );
        } catch (err) {
            Alert.alert("Error", (err as Error).message, [
                {
                    text: "Continuar",
                    onPress: () => router.replace("/(tabs)/bus-stops")
                }
            ]);
        }
    }
    
    return(
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.formContainer, {backgroundColor: Colors[theme].background}]} keyboardShouldPersistTaps="handled">
            <ThemedText type="title">
                {
                    props.status === "start" ?
                    `Inicio de formulario parada #${props.busStop.codigo}`
                    : `Término de formulario parada#${props.busStop.codigo}`
                }
            </ThemedText>
            <ThemedText type="subtitle">
                Orden de trabajo #{props.workOrder.id}
            </ThemedText>
            <ThemedView style={styles.inputContainer}>
                <ThemedText >
                    Descripción <Text color={Colors[theme].icon} size={10} />
                </ThemedText>
                <TextInput maxLength={500} style={[
                    styles.textInput,
                    {
                        backgroundColor: Colors[theme].tint,
                        color: Colors[theme].background
                    }
                ]} 
                readOnly={loading}
                placeholder="Toque para editar texto..."
                placeholderTextColor={Colors[theme].background}
                value={textInputData}
                onChangeText={setTextInputData}
                />
            </ThemedView>
            <ThemedView style={styles.inputContainer}>
                {
                    permission && !permission.granted ?
                    <>
                    <ThemedText type="subtitle" >
                        Se requieren permisos en la app par usar la cámara... <CircleOff size={10} color={ Colors[theme].icon } />
                    </ThemedText>
                    <TouchableOpacity 
                    style={
                        [
                            {
                                backgroundColor: Colors[theme].tint
                            },
                            styles.buttonStyle
                        ]
                    }
                    onPress={requestPermission}
                    >
                        <ThemedText style={{
                            color: Colors[theme].background,
                            fontWeight: "bold"
                        }}>
                            Solicitar permisos
                        </ThemedText>
                    </TouchableOpacity>
                    </>
                    :
                    <>
                    {
                        !picData ?
                        <ThemedText>
                            Captura una foto del lugar <Camera size={12} />
                        </ThemedText>
                        :
                        <ThemedText>
                            Foto tomada:
                        </ThemedText>
                    }
                    {
                        !picData ?
                        <CameraView  facing={facing} style={styles.camera} ref={cameraRef} />
                        :
                        <Image src={`data:image/jpg;base64,${picData}`} height={150} width={250} />
                    }
                    {
                        !picData ?
                        <ThemedView style={styles.cameraButtons} >
                            <TouchableOpacity style={
                                [
                                    {
                                        backgroundColor: Colors[theme].tint
                                    },
                                    styles.buttonStyle
                                ]
                            }
                            onPress={takePicture}
                            >
                                <ThemedText style={{
                                    color: Colors[theme].background
                                }}>
                                    Tomar foto
                                </ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={
                                [
                                    {
                                        backgroundColor: Colors[theme].tint
                                    },
                                    styles.buttonStyle
                                ]
                            }
                            onPress={toggleCameraFacing}
                            >
                                <ThemedText style={{
                                    color: Colors[theme].background
                                }}>
                                    Voltear cámara
                                </ThemedText>
                            </TouchableOpacity>
                        </ThemedView>
                        :
                        <ThemedView style={{
                            justifyContent: "center",
                            width: "100%",
                            padding: 10
                        }} >
                            <TouchableOpacity 
                                style={
                                    [
                                        {
                                            backgroundColor: Colors[theme].tint
                                        },
                                        styles.buttonStyle
                                    ]
                                }
                                onPress={
                                    () => setPicData(undefined)
                                }
                                disabled={loading}
                            >
                                <ThemedText style={{
                                    color: Colors[theme].background
                                }}>
                                    Retomar foto
                                </ThemedText>
                            </TouchableOpacity>
                        </ThemedView>
                    }
                    </>
                }
                <ThemedView style={styles.inputContainer} >
                    <ThemedView style={styles.footerContainer}>
                        <TouchableOpacity
                            style={[
                                {
                                    backgroundColor: Colors[theme].tint
                                },
                                styles.buttonStyle
                            ]}
                            onPress={
                                props.status === "start" ?
                                SaveFirstPartOfForm
                                :
                                saveLastPartOfForm
                            }
                            disabled={loading}
                        >
                            <ThemedText style={{
                                color: Colors[theme].background
                            }} >
                                {
                                    props.status === "start" ?
                                    "Guardar avance"
                                    :
                                    "Finalizar formulario"
                                }
                            </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                {
                                    backgroundColor: Colors[theme].tint
                                },
                                styles.buttonStyle
                            ]}
                            onPress={props.cancelAction}
                            disabled={loading}
                        >
                            <ThemedText style={{
                                color: Colors[theme].background
                            }} >
                                Cancelar
                            </ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                </ThemedView>
            </ThemedView>
        </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    formContainer: {
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        padding: 8,
    },
    inputContainer: {
        flexDirection: "column",
        alignItems: "center",
        alignContent: "center",
        justifyContent: "center",
        textAlign: "center",
        marginVertical: 10,
        padding: 10,
        borderRadius: 8,
        width: "100%"
    },
    footerContainer: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        padding: 10
    },
    textInput: {
        borderStyle: "dotted",
        borderWidth: 0.5,
        padding: 15,
        margin:8,
        width: "100%",
        height: 120
    },
    buttonStyle: {
        padding: 10,
        borderRadius: 8,
        marginHorizontal: 15,
        justifyContent: "center",
        textAlign: "center"
    },
    camera: {
        height: 200,
        width: "100%",
        marginBottom: 8,
    },
    cameraButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 10,
        width: "100%"
    }
})