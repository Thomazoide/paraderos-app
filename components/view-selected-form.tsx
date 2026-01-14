import { ACCESS_TOKEN } from "@/constants/client-data";
import { BACKEND_URL, ENDPOINTS } from "@/constants/endpoints";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme.web";
import { VisitForm } from "@/types/entitites";
import { ResponsePayload } from "@/types/response-payloads";
import { GetRequestConfig } from "@/utils/utilities";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Form, SeparatorHorizontal } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Button, Image, ScrollView, StyleSheet } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export default function ViewSelectedForm(props: {
    form: VisitForm;
    closeAction: () => void
}) {

    const [loadingData, setLoadingData] = useState<boolean>(false);

    const [startDate, setStartDate] = useState<string>();
    const [startHours, setStartHours] = useState<string>();
    const [finishDate, setFinishDate] = useState<string>();
    const [finishHours, setFinishHours] = useState<string>();
    const [startPicB64, setStartPicB64] = useState<string>("");
    const [finishPicB64, setFinishPicB64] = useState<string>("");


    const colorScheme = useColorScheme();
    const theme = colorScheme ?? "light";

    const formatDates = () => {
        try {
            setLoadingData(true);
            const [sDate, sHours] = props.form.creation_date.split("T");
            const [fDate, fHours] = props.form.completion_date!.split("T");
            const [sYear, sMonth, sDay] = sDate.split("-");
            const [fYear, fMonth, fDay] = fDate.split("-");
            setStartHours(sHours.slice(0,sHours.length-1));
            setFinishHours(fHours.slice(0, fHours.length-1));
            setStartDate(`${sDay}-${sMonth}-${sYear}`);
            setFinishDate(`${fDay}-${fMonth}-${fYear}`);
        } catch (err) {
            Alert.alert("Error al cargar datos", err instanceof Error ? err.message : "Error desconocido", [
                {
                    text: "Volver",
                    onPress: props.closeAction
                }
            ]);
        } finally {
            setLoadingData(false);
        }
    }

    const GetPictures = async () => {
        try {
            setLoadingData(true);
            const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN);
            if(!accessToken) throw new Error("Sin token de acceso, inicie sesión nuevamente");
            const formID = props.form.id;
            const endpoint = `${BACKEND_URL}${ENDPOINTS.visitFormPictures(formID)}`;
            const response = await (await fetch(endpoint, GetRequestConfig("GET", "JSON", undefined, accessToken!))).json() as ResponsePayload<{
                picBefore: string;
                picAfter: string;
            }>;
            if(response.error) throw new Error(response.message);
            setStartPicB64(response.data!.picBefore);
            setFinishPicB64(response.data!.picAfter);
        } catch (err) {
            Alert.alert("Error obteniendo datos", err instanceof Error ? err.message : "Error desconocido", [
                {
                    text: "Volver",
                    onPress: props.closeAction
                }
            ]);
        } finally {
            setLoadingData(false);
        }
    }

    useEffect( () => {
        if(!startDate && !finishDate && !startHours && !finishHours) {
            formatDates();
            GetPictures();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [] );

    if(loadingData) {
        return (
            <ThemedView style={styles.mainContainer} >
                <ActivityIndicator size="large" />
            </ThemedView>
        );
    }


    return (
        <ScrollView>
            <ThemedView style={styles.mainContainer} >
                <ThemedText type="title">
                    <Form color={Colors[theme].icon} /> Formulario #{props.form.id}
                </ThemedText>
                <ThemedView style={styles.imageHolder}>
                    <ThemedText type="default" >
                        Fecha y hora de creación: {"\n"} {startDate} a las {startHours}
                    </ThemedText>
                    <ThemedText type="default" >
                        Fecha y hora de cierre: {"\n"} {finishDate} a las {finishHours}
                    </ThemedText>
                </ThemedView>
                <ThemedView style={styles.separatorContainer}>
                    <SeparatorHorizontal/>
                </ThemedView>
                <ThemedView style={styles.imageHolder}>
                    <ThemedText>
                        {props.form.description}
                    </ThemedText>
                </ThemedView>
                <ThemedView style={styles.separatorContainer}>
                    <SeparatorHorizontal/>
                </ThemedView>
                <ThemedView>
                    {
                        startPicB64 === "" && finishPicB64 === "" ?
                        <ThemedText type="defaultSemiBold">
                            Formulario sin fotos...
                        </ThemedText>
                        :
                        <ThemedView>
                            <ThemedText type="defaultSemiBold">Foto de inicio</ThemedText>
                            <ThemedView style={styles.imageHolder}>
                                <Image
                                src={`data:image/jpg;base64,${startPicB64}`}
                                style={styles.previewImage}
                                resizeMode="cover"
                                />
                            </ThemedView>
                            <ThemedText type="defaultSemiBold">Foto de cierre:</ThemedText>
                            <ThemedView style={styles.imageHolder}>
                                <Image 
                                src={`data:image/jpg;base64,${finishPicB64}`}
                                style={styles.previewImage}
                                resizeMode="cover"
                                />
                            </ThemedView>
                        </ThemedView>
                    }
                </ThemedView>
                <Button title="Volver" onPress={props.closeAction} />
            </ThemedView>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    mainContainer: {
        flexDirection: "column",
        paddingVertical: 12,
        paddingHorizontal: 15,
        gap: 10,
        minHeight: "100%"
    },
    separatorContainer: {
        flexDirection: "row",
        width: "100%",
        textAlign: "center",
        justifyContent: "center",
    },
    previewImage: {
        height: 300,
        width: "100%",
        borderRadius: 16
    },
    picturesContainer: {
        flexDirection: "column",
        alignItems: "center",
        width: "100%"
    },
    imageHolder: {
        padding: 12,
        elevation: 3,
        borderRadius: 16,
        width: "100%"
    }
})