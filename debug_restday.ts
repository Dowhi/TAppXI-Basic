import { isRestDay, getExcepciones, getBreakConfiguration } from './services/api';

async function debug() {
    const today = new Date();
    console.log('--- DEBUG REST DAY ---');
    console.log('Today:', today.toLocaleString());
    
    try {
        const config = await getBreakConfiguration();
        console.log('Config:', JSON.stringify(config, null, 2));
        
        const exceptions = await getExcepciones();
        console.log('Exceptions count:', exceptions.length);
        
        const result = await isRestDay(today);
        console.log('Is Rest Day Today?:', result);
    } catch (e) {
        console.error('Debug error:', e);
    }
}

debug();
