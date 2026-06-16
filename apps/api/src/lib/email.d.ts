export interface EmailMessage {
    to: string;
    subject: string;
    text: string;
    html?: string;
}
export declare function sendEmail(message: EmailMessage): Promise<void>;
export declare function studioUrl(path?: string): string;
//# sourceMappingURL=email.d.ts.map