import { WorkOrder } from "./entitites";

export interface LoginPayload {
    username: string;
    password: string;
}

export interface UpdatePasswordInterface {
    oldPassword: string;
    newPassword: string;
    id: number;
}

export interface VerifyTokenPayload {
    token: string;
}

export interface UpdateWorkOrderPayload {
    workOrder: WorkOrder;
    busStopID: number;
}

export interface UpdatePositionPayload {
    id: number;
    lat: number;
    lng: number;
    timestamp: string;
}