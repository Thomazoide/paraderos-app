import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BusStop, WorkOrder } from "@/types/entitites";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { Camera, CircleOff, Text } from "lucide-react-native";
import { useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export default function VisitFormComponent(props: {busStop: BusStop, workOrder: WorkOrder, status: "start" | "finish", cancelAction: () => void}) {
    const [facing, setFacing] = useState<CameraType>("back");
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView | null>(null);
    const [picData, setPicData] = useState<string>();
    const colorScheme = useColorScheme();
    const theme = colorScheme ?? "light";
    const toggleCameraFacing = () => {
        setFacing(current => (current === "back" ? "front" : "back"));
    };
    const takePicture = async () => {
        if(cameraRef.current){
            const picture = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.5
            });
            setPicData(picture.base64!)
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
                placeholder="Toque para editar texto..."
                placeholderTextColor={Colors[theme].background}
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
                            <TouchableOpacity style={
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