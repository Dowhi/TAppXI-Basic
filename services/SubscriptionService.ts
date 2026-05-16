import { auth, db } from './firebaseSync';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ActivationService } from './activation';

export interface UserProfile {
    email: string | null;
    displayName: string | null;
    createdAt: string;
    isPremium: boolean;
    trialEndsAt: string;
}

export const SubscriptionService = {
    async getUserProfile(): Promise<UserProfile | null> {
        const user = auth.currentUser;
        if (!user) return null;

        try {
            const userRef = doc(db, 'usuarios', user.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                return snap.data() as UserProfile;
            }
        } catch (e) {
            console.error('Error fetching profile:', e);
        }
        return null;
    },

    async checkStatus(): Promise<{
        isAllowed: boolean;
        daysLeft: number;
        isPremium: boolean;
    }> {
        const profile = await this.getUserProfile();
        if (!profile) return { isAllowed: false, daysLeft: 0, isPremium: false };

        if (profile.isPremium) {
            return { isAllowed: true, daysLeft: 999, isPremium: true };
        }

        const trialEnd = new Date(profile.trialEndsAt).getTime();
        const now = Date.now();
        const diff = trialEnd - now;
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

        return {
            isAllowed: daysLeft > 0,
            daysLeft: Math.max(0, daysLeft),
            isPremium: false
        };
    },

    async activateWithCode(code: string): Promise<boolean> {
        const user = auth.currentUser;
        if (!user) return false;

        const sanitizedCode = code.trim().toUpperCase();
        
        // Master code check
        if (sanitizedCode === '290998') { // Usando el MASTER_CODE definido en activation.ts
            await this.makePremium(user.uid);
            return true;
        }

        // Generate valid code based on UID
        const validCode = ActivationService.generateValidCode(user.uid);
        
        if (sanitizedCode === validCode) {
            await this.makePremium(user.uid);
            return true;
        }

        return false;
    },

    async makePremium(uid: string) {
        const userRef = doc(db, 'usuarios', uid);
        await updateDoc(userRef, {
            isPremium: true,
            activatedAt: new Date().toISOString()
        });
    }
};
