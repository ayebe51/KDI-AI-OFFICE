export declare class SecretSanitizer {
    private static readonly SECRET_PATTERNS;
    static sanitize(text: string | null | undefined): string;
    static containsSecret(text: string | null | undefined): boolean;
}
