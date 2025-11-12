import crypto from 'crypto';

export function verifyWebhook(body: string, signature: string, signingKey: string) {
    const hmac = crypto.createHmac("sha256", signingKey);
    hmac.update(body, "utf8");
    const digest = hmac.digest("hex");
    return signature === digest;
}