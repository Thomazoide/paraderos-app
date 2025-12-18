import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BusStop, WorkOrder } from "@/types/entitites";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { Text } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export default function VisitFormComponent(props: {busStop: BusStop, workOrder: WorkOrder, status: "start" | "finish", cancelAction: () => void}) {
    const [facing, setFacing] = useState<CameraType>("back");
    const [permission, requestPermission] = useCameraPermissions();
    const colorScheme = useColorScheme();
    const theme = colorScheme ?? "light";
    const toggleCameraFacing = () => {
        setFacing(current => (current === "back" ? "front" : "front"));
    };
    return(
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
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
                <ThemedText>
                    Descripción <Text color={Colors[theme].icon} />
                </ThemedText>
                <TextInput maxLength={500} style={[
                    styles.textInput,
                    {
                        backgroundColor: theme === "dark" ? Colors[theme].tint : Colors[theme].icon,
                        color: Colors[theme].background
                    }
                ]} />
            </ThemedView>
            <ThemedView style={styles.inputContainer}>
                {
                    permission && !permission.granted ?
                    <>
                    <ThemedText>
                        Se requieren permisos en la app par usar la cámara...
                    </ThemedText>
                    <TouchableOpacity 
                    style={
                        [
                            {
                                backgroundColor: Colors[theme].tint
                            }
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
                    <CameraView  facing={facing} style={styles.camera} />
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
        borderRadius: 8,
        padding: 15,
        margin:8,
        width: "100%",
        height: 200
    },
    buttonStyle: {
        padding: 10,
        borderRadius: 8,
        marginHorizontal: 15
    },
    camera: {
        height: 150,
        width: "100%",
        marginBottom: 8,
    }
})