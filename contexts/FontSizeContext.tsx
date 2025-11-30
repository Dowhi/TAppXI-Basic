import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface FontSizeContextType {
    fontSize: number;
    setFontSize: (size: number) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export const FontSizeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [fontSize, setFontSizeState] = useState<number>(() => {
        const saved = localStorage.getItem("tamanoFuente") ?? localStorage.getItem("tam\u00f1oFuente");
        return saved ? parseFloat(saved) : 12;
    });

    useEffect(() => {
        document.documentElement.style.setProperty("--base-font-size", `${fontSize}px`);
        localStorage.setItem("tamanoFuente", fontSize.toString());
        localStorage.removeItem("tam\u00f1oFuente");
    }, [fontSize]);

    const setFontSize = (size: number) => {
        setFontSizeState(size);
    };

    return (
        <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
            {children}
        </FontSizeContext.Provider>
    );
};

export const useFontSize = () => {
    const context = useContext(FontSizeContext);
    if (context === undefined) {
        throw new Error("useFontSize must be used within a FontSizeProvider");
    }
    return context;

}



















