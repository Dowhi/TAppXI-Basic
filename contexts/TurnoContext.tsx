import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Turno } from '../types';
import { getActiveTurno, subscribeToActiveTurno } from '../services/api';

interface TurnoContextType {
    activeTurno: Turno | null;
    isLoading: boolean;
    refetchTurno: () => Promise<void>;
}

const TurnoContext = createContext<TurnoContextType | undefined>(undefined);

export const TurnoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeTurno, setActiveTurno] = useState<Turno | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refetchTurno = useCallback(async () => {
        setIsLoading(true);
        try {
            const turno = await getActiveTurno();
            setActiveTurno(turno);
        } catch (error) {
            console.error('Error fetching active turno:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial load
        refetchTurno();

        // Subscribe to changes (if api supports it, which it does via mock)
        const unsubscribe = subscribeToActiveTurno((turno) => {
            setActiveTurno(turno);
            setIsLoading(false);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [refetchTurno]);

    return (
        <TurnoContext.Provider value={{ activeTurno, isLoading, refetchTurno }}>
            {children}
        </TurnoContext.Provider>
    );
};

export const useActiveTurno = () => {
    const context = useContext(TurnoContext);
    if (context === undefined) {
        throw new Error('useActiveTurno must be used within a TurnoProvider');
    }
    return context;
};
