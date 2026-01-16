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
};
export function FormatDate(ISOStringDate: string): string {
    const [date, hours] = ISOStringDate.split("T");
    const [sYear, sMonth, sDay] = date.split("-");
    const formattedHours =hours.slice(0, hours.length-1);
    return `${sDay}-${sMonth}-${sYear} ${formattedHours}`;
}