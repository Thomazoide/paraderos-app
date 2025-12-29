import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import VisitFormComponent from "@/components/visit-form";
import { ACCESS_TOKEN, USER_DATA, WORK_ORDER_DATA } from "@/constants/client-data";
import { BACKEND_URL, ENDPOINTS } from "@/constants/endpoints";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme.web";
import { BusStop, User, VisitForm, WorkOrder } from "@/types/entitites";
import { ResponsePayload } from "@/types/response-payloads";
import { GetRequestConfig } from "@/utils/utilities";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CheckBox from "expo-checkbox";
import { CheckCircle2, Clock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";

interface visitFormProps {
    busStop: BusStop;
    workOrder: WorkOrder;
    status: "finish";
    formID: number;
}

export default function FormsPage(){
    const [forms, setForms] = useState<VisitForm[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [hideCompleted, setHideCompleted] = useState<boolean>(false);
    const [formProps, setFormProps] = useState<visitFormProps>();
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

    const filteredForms = hideCompleted ? forms.filter( (f) => !f.completed ) : forms;

    const handleFormSelect = async (item: VisitForm) => {
        const busStop = item.busStop;
        const workOrderString = await AsyncStorage.getItem(WORK_ORDER_DATA);
        const workOrderData: WorkOrder = JSON.parse(workOrderString!);
        const formID = item.id
        if(busStop && workOrderData && formID) {
            setFormProps({
                busStop,
                workOrder: workOrderData,
                formID,
                status: "finish"
            });
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
        !formProps ?
        <ThemedView style={styles.listContainer} >
            <ThemedView style={styles.header} >
                <ThemedText type="title" style={styles.headerTitle} >
                    Mis formularios
                </ThemedText>
                <ThemedView style={[styles.filterContainer, {width: "100%", marginLeft: 20}]}>
                    <CheckBox style={styles.checkbox} value={hideCompleted} onValueChange={setHideCompleted} color={ hideCompleted ? Colors[theme].tint : undefined } />
                    <ThemedText style={styles.filterText} >
                        Ocultar completadas
                    </ThemedText>
                </ThemedView>
            </ThemedView>
            {
                forms.length > 0 ?
                <FlatList
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={fetchForms} />
                    }
                    data={filteredForms}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    renderItem={
                        ({item}) => (
                            <ThemedView style={[
                                styles.card, 
                                { 
                                    backgroundColor: theme === "light" ? "#fff" : "#1e1e1e"
                                }
                            ]} >
                                <ThemedView style={styles.cardHeader}>
                                    <ThemedText type="subtitle" style={styles.cardTitle} >
                                        Formulario #{item.id.toString()}
                                    </ThemedText>
                                    <ThemedView style={[
                                        styles.statusBadge,
                                        {
                                            backgroundColor: item.completed ? "#E6F4EA" : "#FFF8E1"
                                        }
                                    ]} >
                                        {item.completed ?
                                            <CheckCircle2 color="green" size={14}/> :
                                            <Clock color="#F57C00" size={14}/>
                                        }
                                        <ThemedText style={[
                                            styles.statusText,
                                            {
                                                color: item.completed ? "green" : "#E65100"
                                            }
                                        ]} >
                                            {item.completed ?
                                                "Completada" :
                                                "Pendiente"
                                            }
                                        </ThemedText>
                                    </ThemedView>
                                </ThemedView>
                                <ThemedView style={styles.cardBody}>
                                    <ThemedText style={{
                                        color: Colors[theme].icon
                                    }}>
                                        Paradero #{item.busStop?.codigo}
                                    </ThemedText>
                                </ThemedView>
                                { !item.completed &&
                                    <TouchableOpacity
                                        style={[
                                            styles.actionButton,
                                            {
                                                backgroundColor: Colors[theme].tint
                                            }
                                        ]}
                                        activeOpacity={0.8}
                                        onPress={ () => handleFormSelect(item) }
                                    >
                                        <ThemedText style={styles.actionButtonText}>
                                            Completar formulario
                                        </ThemedText>
                                    </TouchableOpacity>
                                }
                            </ThemedView>
                            
                        )
                    }
                />
                :
                <ThemedView style={styles.emptyState} >
                    <ThemedText style={{
                        color: Colors[theme].background
                    }} >
                        No hay formularios creados...
                    </ThemedText>
                </ThemedView>
            }
        </ThemedView>
        :
        <VisitFormComponent busStop={formProps.busStop} cancelAction={ () => setFormProps(undefined) } status={formProps.status} workOrder={formProps.workOrder} formID={formProps.formID}/>
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
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10
    },
    headerTitle: {
        fontSize: 28,
        marginBottom: 10
    },
    filterContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10
    },
    checkbox: {
        marginRight: 8,
        borderRadius: 4
    },
    filterText: {
        fontSize: 14
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.05,
        shadowRadius: 3.84,
        elevation: 3
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "800"
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        gap: 4
    },
    statusText: {
        fontSize: 12,
        fontWeight: "bold"
    },
    cardBody: {
        marginBottom: 16
    },
    actionButton: {
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center"
    },
    actionButtonText: {
        color: "white",
        fontWeight: "600",
        fontSize: 16
    },
    emptyState: {
        justifyContent: "center",
        alignItems: "center",
        marginTop: 50
    }
})