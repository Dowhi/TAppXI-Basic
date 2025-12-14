import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { LoadingSpinner } from './LoadingSpinner';

interface ExpenseScannerProps {
    onScanComplete: (data: { importe?: number; litros?: number; concepto?: string }) => void;
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
        const data: { importe?: number; litros?: number; concepto?: string } = {};

        // 1. Extract amounts (prices)
        // Match numbers with 2 decimals, using dot or comma
        const priceRegex = /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})\b/g;
        const matches = text.match(priceRegex);

        if (matches) {
            const numbers = matches.map(m => parseFloat(m.replace(',', '.'))).filter(n => !isNaN(n));
            // Usually the Total is the largest number on the receipt
            if (numbers.length > 0) {
                const maxAmount = Math.max(...numbers);
                data.importe = maxAmount;
            }
        }

        // 2. Extract Liters (if Gasoil/Gasolina)
        // Look for number followed by L or Litros
        const litersRegex = /(\d+(?:[.,]\d{1,2})?)\s*(?:l|litros|ltrs)\b/i;
        const litersMatch = text.match(litersRegex);
        if (litersMatch) {
            data.litros = parseFloat(litersMatch[1].replace(',', '.'));
        }

        // 3. Guess Concept
        const lowerText = text.toLowerCase();
        if (lowerText.includes('repsol') || lowerText.includes('cepsa') || lowerText.includes('bp') || lowerText.includes('galp') || lowerText.includes('gasolinera')) {
            data.concepto = 'Combustible';
        } else if (lowerText.includes('talle') || lowerText.includes('reparacion')) {
            data.concepto = 'Mantenimiento';
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
