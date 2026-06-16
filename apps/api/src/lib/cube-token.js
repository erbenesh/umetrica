import { SignJWT } from 'jose';
export async function createCubeToken(payload) {
    const secret = process.env.CUBEJS_API_SECRET;
    if (!secret) {
        throw new Error('CUBEJS_API_SECRET is not configured');
    }
    const key = new TextEncoder().encode(secret);
    return new SignJWT({
        tenantId: payload.tenantId,
        userId: payload.userId,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(key);
}
