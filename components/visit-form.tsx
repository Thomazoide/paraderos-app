import { ACCESS_TOKEN, ROUTE_DATA, USER_DATA, WORK_ORDER_DATA } from "@/constants/client-data";
import { BACKEND_URL, ENDPOINTS } from "@/constants/endpoints";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BusStop, Route, User, VisitForm, WorkOrder } from "@/types/entitites";
import { UpdateWorkOrderPayload } from "@/types/request-payloads";
import { ResponsePayload } from "@/types/response-payloads";
import { GetRequestConfig } from "@/utils/utilities";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Camera, CircleOff, FileText, RefreshCw, SwitchCamera, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from "react-native";
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
                    onPress: () => props.cancelAction
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
            if(response.data) {
                const updateData: UpdateWorkOrderPayload = {
                    workOrder: props.workOrder,
                    busStopID: props.busStop.id
                };
                const updateWOConfig = GetRequestConfig("POST", "JSON", JSON.stringify(updateData), accessToken!);
                const updateWOEndpoint = `${BACKEND_URL}${ENDPOINTS.workOrderAddVisitedBusStop}`;
                const updateResponse: ResponsePayload<WorkOrder> = await (await fetch(updateWOEndpoint, updateWOConfig)).json();
                if(updateResponse.error) throw new Error(updateResponse.message);
                await AsyncStorage.setItem(WORK_ORDER_DATA, JSON.stringify(updateResponse.data));
                Alert.alert("Formulario cerrado", "El formulario ha sido cerrado exitosamente",[
                    {
                        text: "Continuar",
                        onPress: props.cancelAction
                    }
                ]);
            }
            
        } catch (err) {
            Alert.alert("Error", (err as Error).message, [
                {
                    text: "Continuar",
                    onPress: () => router.replace("/(tabs)/bus-stops")
                }
            ]);
        } finally {
            setLoading(false);
        }
    }
    
    return(
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scrollContainer, {backgroundColor: Colors[theme].background}]} keyboardShouldPersistTaps="handled">
            <ThemedView style={styles.headerContainer}>
                <ThemedText type="title" style={styles.headerTitle}>
                    {props.status === "start" ? "Iniciar Visita" : "Finalizar Visita"}
                </ThemedText>
                <ThemedText style={styles.headerSubtitle}>
                    Parada #{props.busStop.codigo} • Orden #{props.workOrder.id}
                </ThemedText>
            </ThemedView>

            {/* Description Card */}
            <ThemedView style={[
                styles.card, 
                { 
                    backgroundColor: theme === 'light' ? '#fff' : '#1E1E1E',
                    borderColor: Colors[theme].icon + '30'
                }
            ]}>
                <ThemedView style={styles.cardHeader}>
                    <FileText size={18} color={Colors[theme].tint} />
                    <ThemedText type="subtitle" style={styles.cardTitle}>Descripción</ThemedText>
                </ThemedView>
                
                <TextInput 
                    multiline
                    numberOfLines={4}
                    maxLength={500} 
                    style={[
                        styles.textArea,
                        {
                            backgroundColor: theme === 'light' ? '#F5F5F5' : '#2C2C2C',
                            color: Colors[theme].text,
                            borderColor: Colors[theme].icon + '30'
                        }
                    ]} 
                    readOnly={loading}
                    placeholder="Ingrese observaciones del lugar..."
                    placeholderTextColor={Colors[theme].icon}
                    value={textInputData}
                    onChangeText={setTextInputData}
                />
                <ThemedText style={styles.charCount}>
                    {textInputData?.length || 0}/500
                </ThemedText>
            </ThemedView>
            <ThemedView style={[
                styles.card, 
                { 
                    backgroundColor: theme === 'light' ? '#fff' : '#1E1E1E',
                    borderColor: Colors[theme].icon + '30'
                }
            ]}>
                <ThemedView style={styles.cardHeader}>
                    <Camera size={18} color={Colors[theme].tint} />
                    <ThemedText type="subtitle" style={styles.cardTitle}>Evidencia Fotográfica</ThemedText>
                </ThemedView>

                {permission && !permission.granted ? (
                    <ThemedView style={styles.permissionContainer}>
                        <CircleOff size={40} color={Colors[theme].icon} />
                        <ThemedText style={{textAlign: 'center', marginVertical: 10}}>
                            Se requieren permisos para usar la cámara
                        </ThemedText>
                        <TouchableOpacity 
                            style={[styles.smallButton, {backgroundColor: Colors[theme].tint}]}
                            onPress={requestPermission}
                        >
                            <ThemedText style={styles.smallButtonText}>Solicitar permisos</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                ) : (
                    <ThemedView style={styles.cameraWrapper}>
                        {!picData ? (
                            <ThemedView style={styles.cameraContainer}>
                                <CameraView facing={facing} style={styles.camera} ref={cameraRef} />
                                <ThemedView style={styles.cameraControlsOverlay}>
                                    <TouchableOpacity 
                                        style={styles.iconButton}
                                        onPress={toggleCameraFacing}
                                    >
                                        <SwitchCamera color="#fff" size={24} />
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.captureButton}
                                        onPress={takePicture}
                                    >
                                        <ThemedView style={styles.captureButtonInner} />
                                    </TouchableOpacity>

                                    <ThemedView style={{width: 44}} /> {/* Spacer for alignment */}
                                </ThemedView>
                            </ThemedView>
                        ) : (
                            <ThemedView style={styles.previewContainer}>
                                <Image 
                                    src={`data:image/jpg;base64,${picData}`} 
                                    style={styles.previewImage}
                                    resizeMode="cover"
                                />
                                <TouchableOpacity 
                                    style={styles.retakeButton}
                                    onPress={() => setPicData(undefined)}
                                    disabled={loading}
                                >
                                    <RefreshCw color="#fff" size={16} style={{marginRight: 6}} />
                                    <ThemedText style={{color: '#fff', fontWeight: '600'}}>Retomar</ThemedText>
                                </TouchableOpacity>
                            </ThemedView>
                        )}
                    </ThemedView>
                )}
            </ThemedView>
            <ThemedView style={styles.footerContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={props.cancelAction}
                    disabled={loading}
                >
                    <X color={Colors[theme].text} size={20} style={{marginRight: 6}} />
                    <ThemedText style={{color: Colors[theme].text, fontWeight: '600'}}>
                        Cancelar
                    </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.actionButton, 
                        styles.primaryButton,
                        { backgroundColor: Colors[theme].tint }
                    ]}
                    onPress={props.status === "start" ? SaveFirstPartOfForm : saveLastPartOfForm}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText style={styles.primaryButtonText}>
                            {props.status === "start" ? "Guardar Avance" : "Finalizar"}
                        </ThemedText>
                    )}
                </TouchableOpacity>
            </ThemedView>
        </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    scrollContainer: {
        padding: 20,
        paddingBottom: 50
    },
    headerContainer: {
        marginBottom: 20
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: "bold",
        marginBottom: 4
    },
    headerSubtitle: {
        fontSize: 14,
        opacity: 0.6
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 8
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600"
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        height: 120,
        textAlignVertical: "top",
        fontSize: 16
    },
    charCount: {
        textAlign: "right",
        fontSize: 12,
        marginTop: 6,
        opacity: 0.5
    },
    permissionContainer: {
        alignItems: "center",
        padding: 20
    },
    cameraWrapper: {
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#000",
        height: 300
    },
    cameraContainer: {
        flex: 1,
        position: "relative"
    },
    camera: {
        flex: 1,
        width: "100%"
    },
    cameraControlsOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 20,
        backgroundColor: "rgba(0,0,0,0.3)"
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "rgba(255,255,255,0.3)",
        justifyContent: "center",
        alignItems: "center"
    },
    captureButtonInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: "#fff"
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center"
    },
    previewContainer: {
        flex: 1,
        position: "relative"
    },
    previewImage: {
        width: "100%",
        height: "100%"
    },
    retakeButton: {
        position: "absolute",
        bottom: 20,
        alignSelf: "center",
        backgroundColor: "rgba(0,0,0,0.7)",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#fff"
    },
    footerContainer: {
        flexDirection: "row",
        gap: 12,
        marginTop: 10
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        height: 50,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center"
    },
    cancelButton: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "#ccc"
    },
    primaryButton: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 3,
        elevation: 4
    },
    primaryButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16
    },
    smallButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8
    },
    smallButtonText: {
        color: "#fff",
        fontWeight: "600"
    }
})