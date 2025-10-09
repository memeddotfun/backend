import crypto from 'crypto';

export function verifyWebhook(payload: string, nonce: string, timestamp: string, givenSignature: string) {
    const signatureData = nonce + timestamp + payload;
    const signatureBytes = Buffer.from(signatureData);
    const hmac = crypto.createHmac('sha256', Buffer.from(process.env.QUICKNODE_WEBHOOK_SECRET!));
    hmac.update(signatureBytes);
    const computedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(computedSignature, 'hex'),
        Buffer.from(givenSignature, 'hex')
    );
}