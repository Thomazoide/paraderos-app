export type METHOD = "GET" | "POST" | "DELETE";
export type REQUEST_TYPE = "JSON" | "FORM";
export function GetRequestConfig(method: METHOD, type?: REQUEST_TYPE, body?: BodyInit, token?: string): RequestInit {
    return {
        method,
        headers: {
            "Content-Type": type === "JSON" ? "application/json" : "multipart/form-data",
            "Authorization": `Bearer ${token || ""}`
        },
        body
    };
}