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
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const lowerText = text.toLowerCase();

        // 1. Extract amounts (prices)
        // Improved regex to capture amounts with context
        const amountRegex = /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})\b/g;

        let foundAmount = false;

        // Strategy A: Explicit "Total" lines
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if ((lowerLine.includes('total') || lowerLine.includes('venta') || lowerLine.includes('importe')) && !lowerLine.includes('preautorizado') && !lowerLine.includes('subtotal')) {
                const matches = line.match(amountRegex);
                if (matches) {
                    const vals = matches.map(m => parseFloat(m.replace(',', '.'))).filter(n => !isNaN(n));
                    if (vals.length > 0) {
                        data.importe = Math.max(...vals); // Take max on that line (e.g. "Total 35.26 EUR")
                        foundAmount = true;
                        break;
                    }
                }
            }
        }

        // Strategy B: Fallback if no specific total found
        if (!foundAmount) {
            const matches = text.match(amountRegex);
            if (matches) {
                let numbers = matches.map(m => parseFloat(m.replace(',', '.'))).filter(n => !isNaN(n));

                // Filter out likely pre-auth amounts
                const preAuthLines = lines.filter(l => l.toLowerCase().includes('preautorizado'));
                const preAuthNumbers: number[] = [];
                preAuthLines.forEach(l => {
                    const m = l.match(amountRegex);
                    if (m) m.forEach(v => preAuthNumbers.push(parseFloat(v.replace(',', '.'))));
                });

                // Remove preAuthNumbers from detection
                if (preAuthNumbers.length > 0) {
                    numbers = numbers.filter(n => !preAuthNumbers.includes(n));
                }

                if (numbers.length > 0) {
                    data.importe = Math.max(...numbers);
                }
            }
        }

        // 2. Extract Liters
        const litersRegex = /(\d+(?:[.,]\d{1,2})?)\s*(?:l|litros|ltrs)\b/i;
        const litersMatch = text.match(litersRegex);
        if (litersMatch) {
            data.litros = parseFloat(litersMatch[1].replace(',', '.'));
        }

        // 3. Extract Date
        let dateFound = false;
        const dateRegex = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/;

        // Try line by line for "Fecha" label first
        const dateLabelRegex = /fecha\s*[:.]?\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/i;
        for (const line of lines) {
            const match = line.match(dateLabelRegex);
            if (match) {
                const day = parseInt(match[1]);
                const month = parseInt(match[2]) - 1;
                let year = parseInt(match[3]);
                if (year < 100) year += 2000;
                const parsed = new Date(year, month, day);
                if (!isNaN(parsed.getTime())) {
                    data.fecha = parsed;
                    dateFound = true;
                    break;
                }
            }
        }

        // Fallback: any date regex in text
        if (!dateFound) {
            const dateMatch = text.match(dateRegex);
            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const month = parseInt(dateMatch[2]) - 1;
                let year = parseInt(dateMatch[3]);
                if (year < 100) year += 2000;
                const parsedDate = new Date(year, month, day);
                if (!isNaN(parsedDate.getTime())) {
                    data.fecha = parsedDate;
                }
            }
        }

        // 4. Extract NIF/CIF
        const nifRegex = /\b([0-9]{8}[A-Z]|[A-Z][0-9]{8}|[A-Z][0-9]{7}[A-Z])\b/i;
        const nifMatch = text.match(nifRegex);
        if (nifMatch) {
            data.nif = nifMatch[0].toUpperCase();
        }

        // 5. Extract Invoice Number
        // Improved to handle "Factura N." or just "N." at start of line or after Factura
        const invoiceNumRegex = /(?:Factura|Ticket)\s*(?:N[º.]?|Num)?\s*[:.]?\s*([A-Z0-9-/]+)/i;
        const specificInvoiceRegex = /(?:Factura|N\.)\s+([0-9-]+\s+[A-Z0-9]+(?:\s+[0-9]+)?)/i;

        let invoiceMatch = text.match(specificInvoiceRegex);
        if (!invoiceMatch) {
            invoiceMatch = text.match(invoiceNumRegex);
        }

        if (invoiceMatch) {
            data.numeroFactura = invoiceMatch[1].trim();
        }

        // 6. Identify Vendor & Concept
        const knownVendors = [
            { name: 'Repsol', concept: 'Combustible' },
            { name: 'Cepsa', concept: 'Combustible' },
            { name: 'BP', concept: 'Combustible' },
            { name: 'Galp', concept: 'Combustible' },
            { name: 'Shell', concept: 'Combustible' },
            { name: 'Carrefour', concept: 'Combustible' },
            { name: 'Mercadona', concept: 'Supermercado' },
            { name: 'Costco', concept: 'Combustible' },
            { name: 'Ballenoil', concept: 'Combustible' },
            { name: 'Petroprix', concept: 'Combustible' },
            { name: 'Plenoil', concept: 'Combustible' }
        ];

        let foundVendor = false;
        for (const vendor of knownVendors) {
            if (lowerText.includes(vendor.name.toLowerCase())) {
                data.proveedor = vendor.name;
                data.concepto = vendor.concept;
                foundVendor = true;
                break;
            }
        }

        // Fallback for Concept
        if (!data.concepto) {
            if (lowerText.includes('gasoleo') || lowerText.includes('gasolina') || lowerText.includes('diesel') || lowerText.includes('sp 95') || lowerText.includes('sp95')) {
                data.concepto = 'Combustible';
            } else if (lowerText.includes('talle') || lowerText.includes('reparacion') || lowerText.includes('aceite')) {
                data.concepto = 'Mantenimiento';
            }
        }

        // Fallback for Vendor
        if (!data.proveedor && lines.length > 0) {
            const candidate = lines.find(l =>
                l.length > 3 &&
                !l.match(dateRegex) &&
                !l.toLowerCase().includes('factura') &&
                !l.toLowerCase().includes('ticket') &&
                /^[A-Z\s]+$/.test(l)
            );
            if (candidate) {
                data.proveedor = candidate;
            } else {
                const firstLine = lines.find(l => l.length > 4);
                if (firstLine) data.proveedor = firstLine;
            }
        }

        setIsScanning(false);
        onScanComplete(data);
    };

    const CameraIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0z" fill="none" /><circle cx="12" cy="12" r="3.2" /><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" /></svg>
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
                    {!imagePreview ? (
                        <div
                            className="border-2 border-dashed border-zinc-700 rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-zinc-800/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <CameraIcon />
                            <span className="mt-2 text-sm text-zinc-400">Toca para tomar foto o elegir imagen</span>
                        </div>
                    ) : (
                        <div className="relative rounded-lg overflow-hidden h-64 bg-black flex items-center justify-center">
                            <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain opacity-80" />
                            {isScanning && (
                                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                                    <LoadingSpinner size="lg" />
                                    <p className="mt-2 text-white font-semibold animate-pulse">Procesando...</p>
                                </div>
                            )}
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {imagePreview && !isScanning && (
                        <button
                            onClick={() => { setImagePreview(null); fileInputRef.current?.click(); }}
                            className="w-full py-2 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800"
                        >
                            Volver a tomar foto
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
