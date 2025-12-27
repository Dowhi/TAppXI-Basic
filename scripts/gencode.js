const SECRET_SALT = 'TAPPXI_SECURE_2025_V1';

function generateValidCode(targetDeviceId) {
    const cleanId = targetDeviceId.replace(/[^A-Z0-9]/g, '');
    let hash = 0;
    const combined = cleanId + SECRET_SALT;

    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    const code = Math.abs(hash).toString().slice(-6).padStart(6, '0');
    return code;
}

console.log('Code for NQLY-PSY3:', generateValidCode('NQLY-PSY3'));
