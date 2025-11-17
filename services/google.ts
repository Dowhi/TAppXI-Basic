// Carga y autenticación de Google API (Drive y Sheets)
// Requiere configurar CLIENT_ID y API_KEY válidos en Google Cloud Console con OAuth 2.0

const GOOGLE_API_SRC = "https://apis.google.com/js/api.js";

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
].join(" ");

let gapiLoaded = false;
let gapiInit = false;

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
        if (gapiLoaded) return resolve();
        const script = document.createElement("script");
        script.src = GOOGLE_API_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            // @ts-ignore
            window.gapi.load("client:auth2", () => {
                gapiLoaded = true;
                resolve();
            });
        };
        script.onerror = () => reject(new Error("No se pudo cargar Google API"));
        document.body.appendChild(script);
    });
};

export const initGoogleClient = async (): Promise<void> => {
    if (gapiInit) return;
    assertEnvConfigured();
    await loadGapi();
    // @ts-ignore
    const gapi = window.gapi;
    
    try {
        await gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES,
        });
    } catch (e: any) {
        const msg = String(e?.error || e?.details || e?.message || e);
        if (msg.includes('idpiframe_initialization_failed')) {
            throw new Error(
                `Error al inicializar Google Auth.\n\n` +
                `Posibles causas:\n` +
                `1. Los cambios en Google Cloud Console aún no se han propagado (puede tardar 5 minutos a varias horas)\n` +
                `2. El origen "${window.location.origin}" no está correctamente autorizado\n` +
                `3. Verifica que guardaste los cambios en Google Cloud Console\n\n` +
                `Solución:\n` +
                `1. Ve a: https://console.cloud.google.com/apis/credentials\n` +
                `2. Verifica que "${window.location.origin}" esté en "Orígenes autorizados de JavaScript"\n` +
                `3. Si ya está, espera 10-15 minutos y vuelve a intentar\n` +
                `4. Si persiste, prueba en modo incógnito o limpia la caché del navegador`
            );
        }
        throw e;
    }
    
    // Inicializar auth2 de forma más robusta
    try {
        if (!gapi.auth2) {
            // @ts-ignore
            await gapi.load('auth2', () => {
                // @ts-ignore
                gapi.auth2.init({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                });
            });
        } else if (!gapi.auth2.getAuthInstance()) {
            // @ts-ignore
            await gapi.auth2.init({
                client_id: CLIENT_ID,
                scope: SCOPES,
            });
        }
    } catch (authError: any) {
        // Si falla la inicialización de auth2, no es crítico si ya está inicializado
        const authMsg = String(authError?.error || authError?.details || authError?.message || authError);
        if (!authMsg.includes('already initialized')) {
            console.warn('Advertencia al inicializar auth2:', authError);
        }
    }
    
    gapiInit = true;
};

export const ensureGoogleSignIn = async (): Promise<void> => {
    await initGoogleClient();
    // @ts-ignore
    const gapi = window.gapi;
    const auth = gapi.auth2?.getAuthInstance?.();
    if (!auth) {
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'desconocido';
        throw new Error(
            `Google Auth no inicializado.\n\n` +
            `Revisa que:\n` +
            `1. Las credenciales estén correctas en .env\n` +
            `2. El origen "${currentOrigin}" esté autorizado en Google Cloud Console\n` +
            `3. Ve a: APIs y servicios → Credenciales → Edita tu OAuth 2.0 Client ID\n` +
            `4. Añade "${currentOrigin}" en "Orígenes autorizados de JavaScript"`
        );
    }
    try {
        if (!auth.isSignedIn?.get?.()) {
            await auth.signIn();
        }
    } catch (e: any) {
        const msg = String(e?.error || e?.details || e?.message || e);
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'desconocido';
        
        if (msg.includes('origin') || msg.includes('idpiframe_initialization_failed')) {
            throw new Error(
                `❌ Error de autorización de Google.\n\n` +
                `El origen "${currentOrigin}" puede no estar autorizado o los cambios aún no se han propagado.\n\n` +
                `Verifica:\n` +
                `1. Ve a: https://console.cloud.google.com/apis/credentials\n` +
                `2. Busca tu OAuth 2.0 Client ID: ${CLIENT_ID.substring(0, 30)}...\n` +
                `3. Verifica que "${currentOrigin}" esté en "Orígenes autorizados de JavaScript"\n` +
                `4. Si ya está configurado, los cambios pueden tardar 5 minutos a varias horas en aplicarse\n` +
                `5. Espera 10-15 minutos y vuelve a intentar\n` +
                `6. Si persiste, prueba:\n` +
                `   - Limpiar caché del navegador (Ctrl+Shift+Delete)\n` +
                `   - Modo incógnito\n` +
                `   - Reiniciar el navegador`
            );
        }
        throw e;
    }
};

export const getCurrentUserEmail = (): string | null => {
    // @ts-ignore
    const gapi = window.gapi;
    const auth = gapi.auth2?.getAuthInstance?.();
    const user = auth?.currentUser?.get?.();
    const profile = user?.getBasicProfile?.();
    return profile?.getEmail?.() ?? null;
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
    return response.result;
};

export const createSpreadsheetWithSheets = async (title: string, sheetTitles: string[]): Promise<{ spreadsheetId: string }> => {
    await ensureGoogleSignIn();
    // @ts-ignore
    const gapi = window.gapi;
    const resourceBody = {
        properties: { title },
        sheets: sheetTitles.map((t) => ({ properties: { title: t } })),
    };
    // Nota: la firma correcta para gapi es (params, body)
    const resp = await gapi.client.sheets.spreadsheets.create({}, resourceBody);
    return { spreadsheetId: resp.result.spreadsheetId };
};

export const writeSheetValues = async (spreadsheetId: string, sheetTitle: string, values: (string | number | null)[][]): Promise<void> => {
    await ensureGoogleSignIn();
    // @ts-ignore
    const gapi = window.gapi;
    await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A1`,
        valueInputOption: "RAW",
        resource: { values },
    });
};


