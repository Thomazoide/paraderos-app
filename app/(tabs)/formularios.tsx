import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ACCESS_TOKEN, USER_DATA } from "@/constants/client-data";
import { BACKEND_URL, ENDPOINTS } from "@/constants/endpoints";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme.web";
import { Route, User, VisitForm, WorkOrder } from "@/types/entitites";
import { ResponsePayload } from "@/types/response-payloads";
import { GetRequestConfig } from "@/utils/utilities";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CheckBox from "expo-checkbox";
import { Circle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from "react-native";

export default function FormsPage(){
    const [forms, setForms] = useState<VisitForm[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [hideCompleted, setHideCompleted] = useState<boolean>(false);
    const [selectedForm, setSelectedForm] = useState<VisitForm>();
    const [routeData, setRouteData] = useState<Route>();
    const [workOrderData, setWorkOrderData] = useState<WorkOrder>();
    const colorScheme = useColorScheme();
    const theme = colorScheme ?? 'light';

    const fetchForms = async () => {
        try{
            setLoading(true);
            const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN);
            if(!accessToken) throw new Error("Sin token de acceso\nInicie sesión nuevamente");
            const rawUserData = await AsyncStorage.getItem(USER_DATA);
            if(!rawUserData) throw new Error("Sin datos de usuario");
            const userData: User = JSON.parse(rawUserData);
            const endpoint = `${BACKEND_URL}${ENDPOINTS.visitFormByUserID(userData!.id)}`;
            const config = GetRequestConfig("GET", "JSON", undefined, accessToken!);
            const response: ResponsePayload<VisitForm[]> = await (await fetch(endpoint, config)).json();
            if(response.error) throw new Error(response.message);
            setForms(response.data!);
            console.log(response.data);
        } catch(err) {
            console.log(err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }

    const handleFormSelect = async (item: VisitForm) => {
        const busStopID = item.busStopId;
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
        !selectedForm ?
        <ThemedView style={styles.listContainer} >
            <ThemedView style={styles.header} >
                <ThemedText type="title" >
                    Formularios del usuario
                </ThemedText>
                <ThemedView style={[styles.container, {width: "100%", marginLeft: 20}]}>
                    <CheckBox value={hideCompleted} onValueChange={setHideCompleted} color={ hideCompleted ? Colors[theme].tint : undefined } />
                    <ThemedText>
                        Ocultar completadas
                    </ThemedText>
                </ThemedView>
            </ThemedView>
            {
                forms.length > 0 ?
                <FlatList
                    data={forms}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={
                        ({item}) => (
                            <View style={[styles.item, { borderBottomColor: Colors[theme].icon }]} >
                                <ThemedText type="subtitle">
                                    Formulario #{item.id.toString()}
                                </ThemedText>
                                <View style={styles.itemContent}>
                                    <View style={styles.container} >
                                        <Circle color={ item.completed ? "green" : "red" } size={10} />
                                        <ThemedText type="subtitle">
                                            {
                                                item.completed ?
                                                "Completada"
                                                :
                                                "Pendiente"
                                            }
                                        </ThemedText>
                                    </View>
                                    {
                                        !item.completed ?
                                        <TouchableOpacity
                                        style={[
                                            styles.completeButton,
                                            {
                                                backgroundColor: Colors[theme].tint
                                            }
                                        ]}
                                        onPress={ () => handleFormSelect(item)}
                                        >
                                            <ThemedText style={{
                                                color: "white"
                                            }} >
                                                Completar
                                            </ThemedText>
                                        </TouchableOpacity>
                                        : null
                                    }
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
        : null
        //<ThemedView style={styles.listContainer}>
          //  <VisitFormComponent busStop={} cancelAction={ () => setSelectedForm(undefined) } status="finish" workOrder={} formID={}/>
        //</ThemedView>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    container: {
        flexDirection: "row",
        alignItems: "center"
    },
    listContainer: {
        flexDirection: "column"
    },
    listContent: {
        padding: 16,
        paddingBottom: 80
    },
    item: {
        borderTopWidth: 0.5,
        padding: 12,
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
    },
    itemContent: {
        flexDirection: "column",
        alignItems: "flex-start",
        padding: 10
    },
    completeButton: {
        borderWidth: 0.5,
        borderRadius: 15,
        padding: 5
    },
    header: {
        flexDirection: "column",
        gap: 5,
        alignItems: "center"
    }
})