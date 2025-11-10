import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ThemeContextType {
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isDark, setIsDark] = useState<boolean>(() => {
        const saved = localStorage.getItem("temaOscuro");
        return saved === "true" || saved === null;
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add("dark");
            document.body.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
            document.body.classList.remove("dark");
        }
        localStorage.setItem("temaOscuro", isDark.toString());
    }, [isDark]);

    const toggleTheme = () => {
        setIsDark((prev) => !prev);
    };

    const setTheme = (dark: boolean) => {
        setIsDark(dark);
    };

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};






