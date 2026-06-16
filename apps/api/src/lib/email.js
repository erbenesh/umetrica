function getEmailFrom() {
    return process.env.EMAIL_FROM ?? 'umetrica <noreply@localhost>';
}
async function sendViaResend(message) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey)
        return false;
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: getEmailFrom(),
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html ?? message.text.replace(/\n/g, '<br>'),
        }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Resend error ${response.status}: ${body}`);
    }
    return true;
}
function sendViaConsole(message) {
    console.log('\n========== umetrica email ==========');
    console.log(`To: ${message.to}`);
    console.log(`Subject: ${message.subject}`);
    console.log(message.text);
    console.log('====================================\n');
}
export async function sendEmail(message) {
    const transport = process.env.EMAIL_TRANSPORT ?? (process.env.RESEND_API_KEY ? 'resend' : 'console');
    if (transport === 'resend') {
        const sent = await sendViaResend(message);
        if (sent)
            return;
    }
    sendViaConsole(message);
}
export function studioUrl(path = '') {
    const base = process.env.STUDIO_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173';
    return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}
