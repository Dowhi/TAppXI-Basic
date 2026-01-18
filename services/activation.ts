import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY_ACTIVATED = 'tappxi_activated';
const STORAGE_KEY_DEVICE_ID = 'tappxi_device_id';
const SECRET_SALT = 'TAPPXI_SECURE_2025_V1'; // Simple salt for hashing

export const ActivationService = {
    getDeviceId: (): string => {
        let id = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
        if (!id) {
            // Generate a short, readable ID (e.g., A1B2-C3D4)
            // Using random uppercase alphanumeric
            const generatePart = () => Math.random().toString(36).substring(2, 6).toUpperCase();
            id = `${generatePart()}-${generatePart()}`;
            localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
        }
        return id;
    },

    isActivated: (): boolean => {
        return localStorage.getItem(STORAGE_KEY_ACTIVATED) === 'true';
    },

    activate: (code: string): boolean => {
        const sanitizedCode = code.trim().toUpperCase();
        const deviceId = ActivationService.getDeviceId();
        const validCode = ActivationService.generateValidCode(deviceId);

        if (sanitizedCode === validCode) {
            localStorage.setItem(STORAGE_KEY_ACTIVATED, 'true');
            return true;
        }
        return false;
    },

    // This function generates the valid code for ANY device ID.
    // It will be used by the Admin in Settings -> Generate License.
    generateValidCode: (targetDeviceId: string): string => {
        // Simple "Hash": Sum of char codes + Salt logic
        // We want a 4-6 digit number/string that depends deterministically on the ID

        const cleanId = targetDeviceId.replace(/[^A-Z0-9]/g, '');
        let hash = 0;
        const combined = cleanId + SECRET_SALT;

        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        // Convert to positive, take last 6 digits
        const code = Math.abs(hash).toString().slice(-6).padStart(6, '0');
        return code;
    }
};
