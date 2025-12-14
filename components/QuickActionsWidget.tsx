import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // Assuming we can use navigation or passing a handler
import { Seccion } from '../types';

// Icons
const BoltIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
    </svg>
);

const PlaneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
);

interface QuickActionsWidgetProps {
    onQuickAction: (action: string) => void;
}

const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({ onQuickAction }) => {
    return (
        <div className="grid grid-cols-2 gap-3 mb-3">
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onQuickAction('minima')}
                className="glass-card p-3 rounded-xl flex items-center space-x-3 hover:bg-white/5 transition-colors group"
            >
                <div className="bg-yellow-500/20 p-2 rounded-lg text-yellow-400 group-hover:text-yellow-300">
                    <BoltIcon />
                </div>
                <div className="text-left">
                    <p className="text-sm font-medium text-zinc-200">Carrera Mínima</p>
                </div>
            </motion.button>

            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onQuickAction('aeropuerto')}
                className="glass-card p-3 rounded-xl flex items-center space-x-3 hover:bg-white/5 transition-colors group"
            >
                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400 group-hover:text-blue-300">
                    <PlaneIcon />
                </div>
                <div className="text-left">
                    <p className="text-sm font-medium text-zinc-200">Aeropuerto</p>
                </div>
            </motion.button>
        </div>
    );
};

export default QuickActionsWidget;
