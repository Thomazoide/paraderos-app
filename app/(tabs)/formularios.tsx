import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ACCESS_TOKEN } from "@/constants/client-data";
import { BACKEND_URL, ENDPOINTS } from "@/constants/endpoints";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme.web";
import { VisitForm } from "@/types/entitites";
import { ResponsePayload } from "@/types/response-payloads";
import { GetRequestConfig } from "@/utils/utilities";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";

export default function FormsPage(){
    const [forms, setForms] = useState<VisitForm[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const colorScheme = useColorScheme();
    const theme = colorScheme ?? 'light';

    const fetchForms = async () => {
        try{
            setLoading(true);
            const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN);
            if(!accessToken) throw new Error("Sin token de acceso\nInicie sesión nuevamente");
            const endpoint = `${BACKEND_URL}${ENDPOINTS.visitForms}`;
            const config = GetRequestConfig("GET", "JSON", undefined, accessToken!);
            const response: ResponsePayload<VisitForm[]> = await (await fetch(endpoint, config)).json();
            if(response.error) throw new Error(response.message);
            setForms(response.data!);
        } catch(err) {
            console.log(err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }

    useEffect( () => {
        fetchForms();
    }, [] );

    if(loading){
        return (
            <ThemedView style={styles.centered} >
                <ActivityIndicator size="large"/>
            </ThemedView>
        );
    }

    if(error){
        return (
            <ThemedView style={styles.centered}>
                <ThemedText>
                    {error.message}
                </ThemedText>
            </ThemedView>
        )
    }

    

    return(
        <ThemedView style={styles.listContainer} >
            {
                forms.length > 0 ?
                <FlatList
                    data={forms}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={
                        ({item}) => (
                            <View style={[styles.item, { borderBottomColor: Colors[theme].icon }]} >
                                <ThemedText type="title">
                                    Formulario #{item.id.toString()}
                                </ThemedText>
                                <View style={styles.container}>
                                    <View style={item.completed ? styles.dotCompleted : styles.dotPending} />
                                    <ThemedText type="subtitle">
                                        {
                                            item.completed ?
                                            "Completada"
                                            :
                                            "Pendiente"
                                        }
                                    </ThemedText>
                                </View>
                            </View>
                        )
                    }
                />
                :
                <ThemedText style={styles.centered}>
                    Sin formularios creados...
                </ThemedText>
            }
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    container: {
        flex: 1,
        flexDirection: "row"
    },
    listContainer: {
        flex: 1
    },
    listContent: {
        padding: 16,
        paddingBottom: 80
    },
    item: {
        paddingVertical: 12,
        borderBottomWidth: 0.5
    },
    dotCompleted: {
        height: 2,
        width: 2,
        backgroundColor: "green",
        borderRadius: "100%"
    },
    dotPending: {
        height: 2,
        width: 2,
        backgroundColor: "yellow",
        borderRadius: "100%"
    }
})