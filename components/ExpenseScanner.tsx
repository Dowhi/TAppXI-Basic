import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { LoadingSpinner } from './LoadingSpinner';

interface ScanResult {
    importe?: number;
    litros?: number;
    concepto?: string;
    fecha?: Date;
    numeroFactura?: string;
    nif?: string;
    proveedor?: string;
}

interface ExpenseScannerProps {
    onScanComplete: (data: ScanResult) => void;
    onClose: () => void;
}

export const ExpenseScanner: React.FC<ExpenseScannerProps> = ({ onScanComplete, onClose }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImagePreview(event.target?.result as string);
                processImage(file);
            };
            reader.readAsDataURL(file);
        }
    };

    const processImage = async (file: File) => {
        setIsScanning(true);
        try {
            const result = await Tesseract.recognize(
                file,
                'spa', // Spanish
                { logger: (m) => console.log(m) }
            );

            const text = result.data.text;
            console.log("OCR Result:", text);
            parseReceipt(text);
        } catch (error) {
            console.error(error);
            alert('Error al escanear la imagen.');
            setIsScanning(false);
        }
    };

    const parseReceipt = (text: string) => {
        const data: ScanResult = {};
        const lowerText = text.toLowerCase();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // --- 1. Extract AMOUNT (Weighted scoring) ---
        // Regex for currency-like numbers: 10,00 | 10.00 | 1.000,00
        const amountMatchRegex = /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})\b/g;

        // Find all numbers and their positions
        const numberMatches: { value: number; index: number; text: string }[] = [];
        let match;
        while ((match = amountMatchRegex.exec(text)) !== null) {
            // Let's use a safer parser:
            // If it has comma and dot: assume last separator is decimal.
            // If only comma: comma is decimal.
            // If only dot: dot is decimal.
            let cleanVal = parseFloat(match[0].replace(',', '.')); // Standard naive

            if (match[0].includes('.') && match[0].includes(',')) {
                if (match[0].lastIndexOf(',') > match[0].lastIndexOf('.')) {
                    // 1.000,00 -> remove dot, comma to dot
                    cleanVal = parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
                } else {
                    // 1,000.00 -> remove comma
                    cleanVal = parseFloat(match[0].replace(/,/g, ''));
                }
            } else if (match[0].includes(',')) {
                cleanVal = parseFloat(match[0].replace(',', '.'));
            }

            if (!isNaN(cleanVal)) {
                numberMatches.push({ value: cleanVal, index: match.index, text: match[0] });
            }
        }

        let bestAmount = 0;
        let maxScore = -1000;

        // Keywords
        const bonusWords = ['total', 'venta', 'importe', 'pagar', 'cobrado'];
        const penaltyWords = ['preautorizado', 'subtotal', 'entregado', 'cambio', 'ahorro', 'descuento', 'base', 'iva', 'tarjeta', 'efectivo', 'restante', 'puntos', 'euros/l'];

        numberMatches.forEach(num => {
            let score = 0;
            // Context window: look 50 chars before and 20 chars after
            const startStr = Math.max(0, num.index - 50);
            const endStr = Math.min(text.length, num.index + num.text.length + 20);
            const context = text.substring(startStr, endStr).toLowerCase();

            // Scoring
            if (bonusWords.some(w => context.includes(w))) score += 50;
            if (context.includes('total') && context.indexOf('total') < (num.index - startStr)) score += 30; // "Total" appears BEFORE the number

            if (penaltyWords.some(w => context.includes(w))) score -= 100;

            // Specific Penalties
            // Costco specific: "Imp. Preautorizado" is a strong penalty
            if (context.includes('preautorizado')) score -= 500;

            // Prefer numbers that are reasonably sized (e.g. not typically > 200 for gas unless truck?)
            // Just a thought, but maybe dangerous.

            // Penalize very small numbers that look like tax rate (0.21) or quantity (1.00)
            if (num.value < 1.0) score -= 10;

            if (score > maxScore) {
                maxScore = score;
                bestAmount = num.value;
            } else if (score === maxScore) {
                // If tied, prefer larger value?
                // Actually usually Total is largest VALID amount.
                if (num.value > bestAmount) bestAmount = num.value;
            }
        });

        if (bestAmount > 0) {
            data.importe = bestAmount;
        }

        // --- 2. Extract LITERS ---
        const litersRegex = /(\d+(?:[.,]\d{1,2})?)\s*(?:l|litros|ltrs|L)\b/i;
        const litersMatch = text.match(litersRegex);
        if (litersMatch) {
            data.litros = parseFloat(litersMatch[1].replace(',', '.'));
        }

        // --- 3. Extract DATE ---
        let dateFound = false;
        // Search specifically for line starting with Fecha
        const linesDateRegex = /(?:fecha|date)\s*[:.]?\s*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i;
        const fallbackDateRegex = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/;

        for (const line of lines) {
            const m = line.match(linesDateRegex);
            if (m) {
                const day = parseInt(m[1]);
                const month = parseInt(m[2]) - 1;
                let year = parseInt(m[3]);
                if (year < 100) year += 2000;
                const d = new Date(year, month, day);
                if (!isNaN(d.getTime())) {
                    data.fecha = d;
                    dateFound = true;
                    break;
                }
            }
        }
        if (!dateFound) {
            const m = text.match(fallbackDateRegex);
            if (m) {
                const day = parseInt(m[1]);
                const month = parseInt(m[2]) - 1;
                let year = parseInt(m[3]);
                if (year < 100) year += 2000;
                const d = new Date(year, month, day);
                if (!isNaN(d.getTime())) {
                    data.fecha = d;
                }
            }
        }

        // --- 4. Extract NIF ---
        const nifRegex = /\b([0-9]{8}[A-Z]|[A-Z][0-9]{8})\b/i; // Standard formats
        const nifMatch = text.match(nifRegex);
        if (nifMatch) data.nif = nifMatch[0].toUpperCase();

        // --- 5. Extract INVOICE NUM ---
        // Look for "Factura: XXX" or "Ticket: XXX"
        const invoiceRegex = /(?:factura|ticket|fra|n\.|numero)\s*(?:nº|num|n\.)?[:.]?\s*([A-Za-z0-9\-\/]+)/i;
        const invoiceMatch = text.match(invoiceRegex);
        if (invoiceMatch) {
            if (invoiceMatch[1].length > 3) {
                data.numeroFactura = invoiceMatch[1];
            }
        }

        // --- 6. VENDOR & CONCEPT ---
        const vendors = [
            { name: 'Repsol', concept: 'Combustible' },
            { name: 'Cepsa', concept: 'Combustible' },
            { name: 'BP', concept: 'Combustible' },
            { name: 'Galp', concept: 'Combustible' },
            { name: 'Shell', concept: 'Combustible' },
            { name: 'Costco', concept: 'Combustible' },
            { name: 'Petroprix', concept: 'Combustible' },
            { name: 'Ballenoil', concept: 'Combustible' },
            { name: 'Plenoil', concept: 'Combustible' },
            { name: 'Carrefour', concept: 'Combustible' },
            { name: 'Mercadona', concept: 'Supermercado' },
            { name: 'Alcampo', concept: 'Supermercado' },
            { name: 'Lidl', concept: 'Supermercado' },
        ];

        for (const v of vendors) {
            if (lowerText.includes(v.name.toLowerCase())) {
                data.proveedor = v.name;
                data.concepto = v.concept;
                break;
            }
        }

        // Vendor Fallback
        if (!data.proveedor) {
            const possibleVendor = lines.find(l =>
                l.length > 3 &&
                /^[A-ZÁÉÍÓÚÑ\s\.]+$/.test(l) &&
                !l.toLowerCase().includes('factura') &&
                !l.toLowerCase().includes('ticket') &&
                !l.toLowerCase().includes('cliente') &&
                !l.match(/\d/) // Usually vendor name line has no numbers (unless 24H)
            );
            if (possibleVendor) data.proveedor = possibleVendor;
        }

        // Concept Fallback
        if (!data.concepto) {
            if (lowerText.includes('gasolina') || lowerText.includes('liter') || lowerText.includes('litros') || lowerText.includes('db gasoleo') || lowerText.includes('diesel')) {
                data.concepto = 'Combustible';
            } else if (lowerText.includes('talle') || lowerText.includes('reparacion') || lowerText.includes('neumaticos')) {
                data.concepto = 'Mantenimiento';
            }
        }

        setIsScanning(false);
        onScanComplete(data);
    };

    const CameraIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><circle cx="12" cy="12" r="3.2" /><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" /></svg>
    );

    const GalleryIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
    );

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-xl max-w-sm w-full p-4 border border-zinc-700 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-zinc-100">Escanear Ticket</h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-red-400">
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Preview Area */}
                    {imagePreview ? (
                        <div className="relative rounded-lg overflow-hidden h-64 bg-black flex items-center justify-center border border-zinc-700">
                            <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                            {isScanning && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <LoadingSpinner size="lg" />
                                    <p className="mt-3 text-white font-semibold animate-pulse">Analizando Ticket...</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center border-2 border-dashed border-zinc-700 rounded-lg bg-zinc-800/30">
                            <p className="text-zinc-500 text-sm p-4 text-center">Selecciona una opción abajo</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {!isScanning && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                className="flex flex-col items-center justify-center p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors gap-2"
                            >
                                <CameraIcon />
                                <span className="font-semibold text-sm">Cámara</span>
                            </button>

                            <button
                                onClick={() => galleryInputRef.current?.click()}
                                className="flex flex-col items-center justify-center p-4 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg transition-colors gap-2"
                            >
                                <GalleryIcon />
                                <span className="font-semibold text-sm">Galería</span>
                            </button>
                        </div>
                    )}

                    {/* Hidden Inputs */}
                    <input
                        type="file"
                        ref={cameraInputRef}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <input
                        type="file"
                        ref={galleryInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {imagePreview && !isScanning && (
                        <button
                            onClick={() => {
                                setImagePreview(null);
                                // Optional: reset file inputs
                            }}
                            className="w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                        >
                            Cancelar / Nueva Foto
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
