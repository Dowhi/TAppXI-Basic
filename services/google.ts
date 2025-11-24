// Carga y autenticación de Google API (Drive y Sheets)
// Migrado a Google Identity Services (GIS) SDK
// Requiere configurar CLIENT_ID y API_KEY válidos en Google Cloud Console

const GOOGLE_API_SRC = "https://apis.google.com/js/api.js";
const GIS_API_SRC = "https://accounts.google.com/gsi/client";

// TODO: Reemplazar por tus credenciales en .env (Vite)
const CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";
const API_KEY = (import.meta as any).env?.VITE_GOOGLE_API_KEY || "";

const DISCOVERY_DOCS = [
    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
    "https://sheets.googleapis.com/$discovery/rest?version=v4",
];

const SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly"
].join(" ");

let tokenClient: any = null;
let gapiInited = false;
let gisInited = false;

const assertEnvConfigured = () => {
    if (!CLIENT_ID || !API_KEY) {
        const errorMsg = 
            "Configuración de Google faltante: define VITE_GOOGLE_CLIENT_ID y VITE_GOOGLE_API_KEY en tu .env\n\n" +
            "Pasos:\n" +
            "1. Crea un archivo .env en la raíz del proyecto\n" +
            "2. Añade: VITE_GOOGLE_CLIENT_ID=tu_client_id\n" +
            "3. Añade: VITE_GOOGLE_API_KEY=tu_api_key\n" +
            "4. Reinicia el servidor (npm run dev)";
        throw new Error(errorMsg);
    }
};

// Exponer configuración en modo desarrollo para diagnóstico rápido:
try {
    // @ts-ignore
    const isDev = (import.meta as any)?.env?.DEV;
    if (isDev && typeof window !== 'undefined') {
        // @ts-ignore
        (window as any).__tappxiGoogleCfg = {
            clientId: CLIENT_ID,
            apiKey: API_KEY,
            origin: typeof window !== 'undefined' ? window.location.origin : null,
        };
    }
} catch {
    // no-op
}

const loadGapi = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (gapiInited) return resolve();
        
        // @ts-ignore
        if (window.gapi) {
            // @ts-ignore
            window.gapi.load("client", async () => {
                try {
                    // @ts-ignore
                    await window.gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: DISCOVERY_DOCS,
                    });
                    gapiInited = true;
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            return;
        }
        
        const script = document.createElement("script");
        script.src = GOOGLE_API_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => {
             // @ts-ignore
            window.gapi.load("client", async () => {
                try {
                    // @ts-ignore
                    await window.gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: DISCOVERY_DOCS,
                    });
                    gapiInited = true;
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        };
        script.onerror = () => reject(new Error("No se pudo cargar Google API script."));
        document.head.appendChild(script);
    });
};

const loadGis = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (gisInited) return resolve();

        const initTokenClient = () => {
            // @ts-ignore
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (resp: any) => {
                    if (resp.error !== undefined) {
                        throw (resp);
                    }
                },
            });
            gisInited = true;
            resolve();
        };

        // @ts-ignore
        if (window.google && window.google.accounts) {
            initTokenClient();
            return;
        }

        const script = document.createElement("script");
        script.src = GIS_API_SRC;
        script.async = true;
        script.defer = true;
        script.onload = initTokenClient;
        script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services script."));
        document.head.appendChild(script);
    });
};

export const initGoogleClient = async (): Promise<void> => {
    assertEnvConfigured();
    await Promise.all([loadGapi(), loadGis()]);
};

export const ensureGoogleSignIn = async (): Promise<void> => {
    await initGoogleClient();
    
    // @ts-ignore
    const gapi = window.gapi;
    // Verificar si tenemos un token válido
    const token = gapi.client.getToken();
    
    if (token && Date.now() < (token.expires_in || 3600) * 1000 + (token.created || 0)) {
        // Token válido (aproximación, GIS maneja esto mejor pero gapi necesita el token set)
        return;
    }

    return new Promise((resolve, reject) => {
        try {
            // @ts-ignore
            tokenClient.callback = (resp: any) => {
                if (resp.error !== undefined) {
                    reject(resp);
                }
                resolve(resp);
            };
            // @ts-ignore
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (err) {
            reject(err);
        }
    });
};

export const getCurrentUserEmail = (): string | null => {
    // GIS no expone el perfil del usuario directamente como auth2.
    // Se requeriría llamar a la API de People o userinfo, pero para backup no es estrictamente necesario.
    // Retornamos null o implementamos una llamada a userinfo si es crítico.
    return null; 
};

export const uploadFileToDrive = async (opts: {
    name: string;
    mimeType: string;
    content: Blob | string;
    parents?: string[];
}): Promise<any> => {
    await ensureGoogleSignIn();
    // @ts-ignore
    const gapi = window.gapi;
    
    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--";

    const metadata = {
        name: opts.name,
        mimeType: opts.mimeType,
        ...(opts.parents ? { parents: opts.parents } : {}),
    };

    const reader = async () => {
        if (opts.content instanceof Blob) {
            const arrayBuffer = await opts.content.arrayBuffer();
            // Base64
            const bytes = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }
        return btoa(unescape(encodeURIComponent(opts.content)));
    };

    try {
        const base64Data = await reader();
        const multipartRequestBody =
            delimiter +
            "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
            JSON.stringify(metadata) +
            delimiter +
            "Content-Type: " + opts.mimeType + "\r\n" +
            "Content-Transfer-Encoding: base64\r\n" +
            "\r\n" +
            base64Data +
            closeDelimiter;

        const response = await gapi.client.request({
            path: "/upload/drive/v3/files",
            method: "POST",
            params: { uploadType: "multipart" },
            headers: {
                "Content-Type": "multipart/related; boundary=" + boundary,
            },
            body: multipartRequestBody,
        });
        
        if (!response || !response.result || !response.result.id) {
            throw new Error("No se recibió respuesta válida de Google Drive.");
        }
        
        return response.result;
    } catch (e: any) {
        console.error("Error uploadFileToDrive", e);
        throw e;
    }
};

export const listFiles = async (query: string): Promise<any[]> => {
    await ensureGoogleSignIn();
    // @ts-ignore
    const gapi = window.gapi;

    try {
        const response = await gapi.client.request({
            path: "/drive/v3/files",
            method: "GET",
            params: {
                q: query,
                fields: "files(id, name, createdTime, mimeType)",
                orderBy: "createdTime desc",
            },
        });

        if (!response || !response.result || !response.result.files) {
            return [];
        }

        return response.result.files;
    } catch (e: any) {
        console.error("Error listFiles", e);
        throw e;
    }
};

export const getFileContent = async (fileId: string): Promise<any> => {
    await ensureGoogleSignIn();
    // @ts-ignore
    const gapi = window.gapi;

    try {
        const response = await gapi.client.request({
            path: `/drive/v3/files/${fileId}`,
            method: "GET",
            params: {
                alt: "media",
            },
        });

        if (!response || !response.body) {
            throw new Error("No se pudo descargar el contenido del archivo.");
        }

        // gapi client returns body as string for JSON content usually
        return JSON.parse(response.body);
    } catch (e: any) {
        console.error("Error getFileContent", e);
        throw e;
    }
};

export const createSpreadsheetWithSheets = async (title: string, sheetTitles: string[]): Promise<{ spreadsheetId: string }> => {
    await ensureGoogleSignIn();
    // @ts-ignore
    const gapi = window.gapi;
    
    const resourceBody = {
        properties: { title },
        sheets: sheetTitles.map((t) => ({ properties: { title: t } })),
    };
    
    try {
        const resp = await gapi.client.sheets.spreadsheets.create({}, resourceBody);
        
        if (!resp || !resp.result || !resp.result.spreadsheetId) {
            throw new Error("No se recibió respuesta válida de Google Sheets.");
        }
        
        return { spreadsheetId: resp.result.spreadsheetId };
    } catch (e: any) {
        console.error("Error createSpreadsheetWithSheets", e);
        throw e;
    }
};

export const writeSheetValues = async (spreadsheetId: string, sheetTitle: string, values: (string | number | null)[][]): Promise<void> => {
    await ensureGoogleSignIn();
    // @ts-ignore
    const gapi = window.gapi;
    
    if (!values || values.length === 0) {
        return;
    }
    
    try {
        const response = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetTitle}!A1`,
            valueInputOption: "RAW",
            resource: { values },
        });
        
        if (!response || !response.result) {
            throw new Error(`No se recibió respuesta válida al escribir en la hoja "${sheetTitle}"`);
        }
    } catch (e: any) {
        console.error("Error writeSheetValues", e);
        throw e;
    }
};
