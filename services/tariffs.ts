import { Ajustes } from "../types";

export interface TariffResult {
    amount: number;
    tariffName: string; // "Tarifa 1", "Tarifa 2", etc.
    isAeropuerto: boolean;
    isNight?: boolean;
}

export const DEFAULT_RATES = {
    tarifa1: 4.40,
    tarifa2: 5.47,
    tarifa3: 6.85,
    tarifaAeropuertoDia: 25.72,
    tarifaAeropuertoNoche: 28.67,
};

export const getRatesFromStorage = () => {
    return {
        tarifa1: parseFloat(localStorage.getItem('tarifa1') || DEFAULT_RATES.tarifa1.toString()),
        tarifa2: parseFloat(localStorage.getItem('tarifa2') || DEFAULT_RATES.tarifa2.toString()),
        tarifa3: parseFloat(localStorage.getItem('tarifa3') || DEFAULT_RATES.tarifa3.toString()),
        tarifaAeropuertoDia: parseFloat(localStorage.getItem('tarifaAeropuertoDia') || DEFAULT_RATES.tarifaAeropuertoDia.toString()),
        tarifaAeropuertoNoche: parseFloat(localStorage.getItem('tarifaAeropuertoNoche') || DEFAULT_RATES.tarifaAeropuertoNoche.toString()),
    };
};

export const getCurrentMinimaRate = (date: Date = new Date()): TariffResult => {
    const rates = getRatesFromStorage();
    const day = date.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
    const hour = date.getHours();

    // Logic for Seville Taxi Rates
    // T3: Fri 22-24, Sat 00-06, Sat 22-24, Sun 00-06, Sun 22-24 (assuming Sun night is T3 like holidays)
    // T2: Mon-Thu 00-07 & 21-24. Fri 00-07 & 21-22. Sat 07-22. Sun 07-22.
    // T1: Mon-Fri 07-21.

    // Check T3 (Special Night) first
    const isFridayNight = day === 5 && hour >= 22;
    const isSaturdayNight = day === 6 && hour >= 22;
    const isSundayNight = day === 0 && hour >= 22;
    const isSaturdayMorning = day === 6 && hour < 6;
    const isSundayMorning = day === 0 && hour < 6;
    // Monday morning 0-6 is technically T2 in general L-J rules unless it's a holiday. 
    // Assuming standard week:

    if (isFridayNight || isSaturdayNight || isSundayNight || isSaturdayMorning || isSundayMorning) {
        return { amount: rates.tarifa3, tariffName: "Tarifa 3", isAeropuerto: false, isNight: true };
    }

    // Check T2 (Night / Weekend Day)
    const isWeekendDay = (day === 6 || day === 0) && (hour >= 7 && hour < 22);
    const isWeekdayNight = (day >= 1 && day <= 5) && (hour < 7 || hour >= 21);
    // Be careful with Fri 21-22 (It's T2, T3 starts at 22). My logic above handled Fri >= 22.
    // So Fri 21 is T2.

    if (isWeekendDay || isWeekdayNight) {
        return { amount: rates.tarifa2, tariffName: "Tarifa 2", isAeropuerto: false, isNight: true };
    }

    // Default T1 (Weekday Day)
    return { amount: rates.tarifa1, tariffName: "Tarifa 1", isAeropuerto: false, isNight: false };
};

export const getCurrentAeropuertoRate = (date: Date = new Date()): TariffResult => {
    const rates = getRatesFromStorage();
    const day = date.getDay(); // 0 = Sun, 1 = Mon
    const hour = date.getHours();

    // T5 (Night/Weekend) vs T4 (Day Workday)
    // T4: L-V 07-21
    // T5: Rest

    const isWeekend = day === 0 || day === 6;
    const isNight = hour < 7 || hour >= 21;

    if (isWeekend || isNight) {
        return { amount: rates.tarifaAeropuertoNoche, tariffName: "Tarifa 5", isAeropuerto: true, isNight: true };
    }

    return { amount: rates.tarifaAeropuertoDia, tariffName: "Tarifa 4", isAeropuerto: true, isNight: false };
};
