// Google Identity Services (GIS) - Implementación desde cero
// Usa Google Identity Services SDK para autenticación OAuth 2.0

const GOOGLE_API_SRC = "https://apis.google.com/js/api.js";
const GIS_API_SRC = "https://accounts.google.com/gsi/client";

// Credenciales desde variables de entorno
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

const DISCOVERY_DOCS = [
    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
    "https://sheets.googleapis.com/$discovery/rest?version=v4",
];

const SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets"
].join(" ");

// Estado global
let tokenClient: any = null;
let gapiInited = false;
let gisInited = false;
let currentToken: any = null;

/**
 * Verifica que las credenciales estén configuradas
 */
const assertEnvConfigured = (): void => {
    if (!CLIENT_ID || !API_KEY) {
        throw new Error(
            "Configuración de Google faltante.\n\n" +
            "Pasos:\n" +
            "1. Crea un archivo .env en la raíz del proyecto\n" +
            "2. Añade: VITE_GOOGLE_CLIENT_ID=tu_client_id\n" +
            "3. Añade: VITE_GOOGLE_API_KEY=tu_api_key\n" +
            "4. Reinicia el servidor (npm run dev)"
        );
    }
};

/**
 * Carga e inicializa Google API (gapi)
 */
const loadGapi = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (gapiInited) {
            resolve();
            return;
        }

        // Si ya está cargado
        if ((window as any).gapi) {
            (window as any).gapi.load("client", async () => {
                try {
                    await (window as any).gapi.client.init({
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

        // Cargar script
        const script = document.createElement("script");
        script.src = GOOGLE_API_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            (window as any).gapi.load("client", async () => {
                try {
                    await (window as any).gapi.client.init({
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

/**
 * Carga e inicializa Google Identity Services (GIS)
 */
const loadGis = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (gisInited) {
            resolve();
            return;
        }

        const initTokenClient = () => {
            try {
                tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: (resp: any) => {
                        if (resp.error !== undefined) {
                            throw resp;
                        }
                        // El token se maneja en ensureGoogleSignIn
                    },
                });
                gisInited = true;
                resolve();
            } catch (err) {
                reject(err);
            }
        };

        // Si ya está cargado
        if ((window as any).google && (window as any).google.accounts) {
            initTokenClient();
            return;
        }

        // Cargar script
        const script = document.createElement("script");
        script.src = GIS_API_SRC;
        script.async = true;
        script.defer = true;
        script.onload = initTokenClient;
        script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services script."));
        document.head.appendChild(script);
    });
};

/**
 * Inicializa los clientes de Google (gapi y GIS)
 */
export const initGoogleClient = async (): Promise<void> => {
    if (!CLIENT_ID || !API_KEY) {
        console.warn("Google configuration missing. Cloud features will be unavailable.");
        return;
    }
    await Promise.all([loadGapi(), loadGis()]);
};

/**
 * Asegura que el usuario esté autenticado y tenga un token válido
 */
export const ensureGoogleSignIn = async (): Promise<void> => {
    assertEnvConfigured();
    await initGoogleClient();

    const gapi = (window as any).gapi;

    // Verificar si tenemos un token válido
    const token = gapi.client.getToken();

    if (token) {
        const expiresAt = (token.created || 0) + (token.expires_in || 3600) * 1000;
        const now = Date.now();

        // Si el token es válido y no ha expirado
        if (now < expiresAt) {
            // Verificar scopes
            const requiredScopes = SCOPES.split(' ');
            const grantedScopes = (token.scope || '').split(' ');
            const hasAllScopes = requiredScopes.every(s => grantedScopes.includes(s));

            if (hasAllScopes) {
                currentToken = token;
                return; // Token válido
            }
        }
    }

    // Necesitamos un nuevo token
    return new Promise((resolve, reject) => {
        try {
            tokenClient.callback = (resp: any) => {
                if (resp.error !== undefined) {
                    console.error("Error en autenticación Google:", resp);
                    reject(resp);
                    return;
                }

                console.log("Autenticación Google exitosa");

                // Actualizar token en gapi
                if (resp.access_token) {
                    const tokenWithCreated = {
                        ...resp,
                        created: Date.now()
                    };
                    gapi.client.setToken(tokenWithCreated);
                    currentToken = tokenWithCreated;
                }

                resolve(resp);
            };

            // Intentar login silencioso por defecto (o con prompt vacío para dejar que el navegador decida)
            // Si falla o no hay sesión, Google mostrará el popup automáticamente si es necesario o podemos catch el error
            tokenClient.requestAccessToken({ prompt: '' });
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Obtiene el email del usuario actual (si está disponible)
 */
export const getCurrentUserEmail = (): string | null => {
    // GIS no expone el email directamente, se necesitaría llamar a la API de userinfo
    return null;
};

/**
 * Sube un archivo a Google Drive
 */
export const uploadFileToDrive = async (opts: {
    name: string;
    mimeType: string;
    content: Blob | string;
    parents?: string[];
}): Promise<any> => {
    await ensureGoogleSignIn();
    const gapi = (window as any).gapi;

    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--";

    const metadata = {
        name: opts.name,
        mimeType: opts.mimeType,
        ...(opts.parents ? { parents: opts.parents } : {}),
    };

    // Convertir contenido a base64
    const reader = async () => {
        if (opts.content instanceof Blob) {
            const arrayBuffer = await opts.content.arrayBuffer();
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

/**
 * Lista archivos en Google Drive según una query
 */
export const listFiles = async (query: string): Promise<any[]> => {
    await ensureGoogleSignIn();
    const gapi = (window as any).gapi;

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

/**
 * Obtiene el contenido de un archivo de Google Drive
 */
export const getFileContent = async (fileId: string): Promise<any> => {
    await ensureGoogleSignIn();
    const gapi = (window as any).gapi;

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

        // Si es JSON, parsearlo
        try {
            return JSON.parse(response.body);
        } catch {
            return response.body;
        }
    } catch (e: any) {
        console.error("Error getFileContent", e);
        throw e;
    }
};

/**
 * Crea una nueva hoja de cálculo en Google Sheets con múltiples hojas
 */
export const createSpreadsheetWithSheets = async (
    title: string,
    sheetTitles: string[]
): Promise<{ spreadsheetId: string }> => {
    await ensureGoogleSignIn();
    const gapi = (window as any).gapi;

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

/**
 * Escribe valores en una hoja de Google Sheets
 */
export const writeSheetValues = async (
    spreadsheetId: string,
    sheetTitle: string,
    values: (string | number | null)[][]
): Promise<void> => {
    await ensureGoogleSignIn();
    const gapi = (window as any).gapi;

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

/**
 * Busca una hoja de cálculo por nombre exacto
 */
export const findSpreadsheetByName = async (name: string): Promise<{ id: string; name: string } | null> => {
    await ensureGoogleSignIn();
    const gapi = (window as any).gapi;

    try {
        const response = await gapi.client.drive.files.list({
            q: `name = '${name}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
            fields: 'files(id, name)',
        });

        const files = response.result.files;
        if (files && files.length > 0) {
            return files[0];
        }
        return null;
    } catch (e) {
        console.error("Error finding spreadsheet:", e);
        return null; // Don't throw, just return not found
    }
};

/**
 * Lee valores de una hoja de Google Sheets
 */
export const readSheetValues = async (
    spreadsheetId: string,
    range: string
): Promise<any[][]> => {
    await ensureGoogleSignIn();
    const gapi = (window as any).gapi;

    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        if (!response || !response.result || !response.result.values) {
            return [];
        }

        return response.result.values;
    } catch (e: any) {
        console.error("Error readSheetValues", e);
        throw e;
    }
};

/**
 * Añade filas a una hoja de cálculo
 */
export const appendValues = async (
    spreadsheetId: string,
    range: string,
    values: (string | number | boolean | null)[][]
): Promise<void> => {
    await ensureGoogleSignIn();
    const gapi = (window as any).gapi;

    try {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: "USER_ENTERED", // Permite fórmulas y formatos
            insertDataOption: "INSERT_ROWS",
            resource: { values },
        });
    } catch (e) {
        console.error("Error appending values:", e);
        throw e;
    }
};

/**
 * Actualiza un rango específico
 */
export const updateValues = async (
    spreadsheetId: string,
    range: string,
    values: (string | number | boolean | null)[][]
): Promise<void> => {
    await ensureGoogleSignIn();
    const gapi = (window as any).gapi;

    try {
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: "USER_ENTERED",
            resource: { values },
        });
    } catch (e) {
        console.error("Error updating values:", e);
        throw e;
    }
};

/**
 * Limpia un rango (para borrar filas lógicamente)
 */
export const clearRange = async (
    spreadsheetId: string,
    range: string
): Promise<void> => {
    await ensureGoogleSignIn();
    const gapi = (window as any).gapi;

    try {
        await gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId,
            range,
        });
    } catch (e) {
        console.error("Error clearing range:", e);
        throw e;
    }
};

/**
 * Obtiene información completa de la hoja (pestañas)
 */
export const getSpreadsheetDetails = async (spreadsheetId: string): Promise<any> => {
    await ensureGoogleSignIn();
    const gapi = (window as any).gapi;
    try {
        const response = await gapi.client.sheets.spreadsheets.get({
            spreadsheetId
        });
        return response.result;
    } catch (e) {
        console.error("Error getting spreadsheet details:", e);
        throw e;
    }
};

/**
 * Añade una nueva pestaña a la hoja de cálculo
 */
export const addSheet = async (spreadsheetId: string, title: string): Promise<void> => {
    await ensureGoogleSignIn();
    const gapi = (window as any).gapi;
    try {
        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    addSheet: {
                        properties: { title }
                    }
                }]
            }
        });
    } catch (e) {
        // Ignorar si ya existe (error 400 generalmente)
        console.log(`Sheet ${title} might already exist or error:`, e);
    }
};
