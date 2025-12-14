import { useState, useCallback, useRef, useEffect } from 'react';

export interface ExtractedRaceData {
    taximetro?: number;
    cobrado?: number;
    formaPago?: 'Efectivo' | 'Tarjeta' | 'Bizum' | 'Vales';
    tipoCarrera?: 'Urbana' | 'Interurbana';
    aeropuerto?: boolean;
    emisora?: boolean;
    estacion?: boolean;
    propina?: number;
}

const parseRaceCommand = (text: string): ExtractedRaceData => {
    const data: ExtractedRaceData = {};
    const lowerText = text.toLowerCase();

    // 1. Detectar Importe (Taximetro/Cobrado)
    // Busca patrones como "15 con 50", "15,50", "15 euros", "15.50"
    const amountRegex = /(\d+)(?:[.,](\d{1,2})| con (\d{1,2}))?/;
    const amountMatch = lowerText.match(amountRegex);

    if (amountMatch) {
        const integerPart = parseInt(amountMatch[1]);
        const decimalPart = amountMatch[2] || amountMatch[3] || '0';
        const amount = parseFloat(`${integerPart}.${decimalPart}`);

        data.taximetro = amount;
        data.cobrado = amount; // Por defecto asumimos que lo cobrado es igual al taxímetro
    }

    // Si dice explícitamente "cobrado X" y "taximetro Y" (más complejo), 
    // para esta versión simple asumimos "Carrera de X euros"

    // 2. Detectar Forma de Pago
    if (lowerText.includes('tarjeta')) data.formaPago = 'Tarjeta';
    else if (lowerText.includes('bizum')) data.formaPago = 'Bizum';
    else if (lowerText.includes('vale')) data.formaPago = 'Vales';
    else if (lowerText.includes('efectivo')) data.formaPago = 'Efectivo';

    // 3. Detectar Extras/Ubicaciones
    if (lowerText.includes('aeropuerto')) {
        data.aeropuerto = true;
        data.tipoCarrera = 'Interurbana'; // Asumimos interurbana para aeropuerto a menudo
        // Si hay suplemento fijo, podríamos sumarlo, pero mejor dejar que el usuario diga el total
    }

    if (lowerText.includes('estación') || lowerText.includes('estacion') || lowerText.includes('sants') || lowerText.includes('atocha')) { // Ejemplos genéricos
        data.estacion = true;
    }

    if (lowerText.includes('emisora') || lowerText.includes('radio') || lowerText.includes('aplicación') || lowerText.includes('app')) {
        data.emisora = true;
    }

    return data;
};

export const useVoiceInput = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            // @ts-ignore
            recognitionRef.current = new window.webkitSpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.lang = 'es-ES';
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setError(event.error);
                setIsListening(false);
            };

            recognitionRef.current.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                setTranscript(text);
            };
        } else {
            setError('Voice recognition not supported in this browser.');
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error(e);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const processCommand = useCallback((text: string) => {
        return parseRaceCommand(text);
    }, []);

    return {
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
        processCommand,
        supported: !!recognitionRef.current
    }; // Fixed return to object shorthand if property name matches
};
