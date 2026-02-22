export interface IAuthConfig {
    jwtAccessSecret: string;
    jwtRefreshSecret: string;
    jwtAccessTtl: string;
    jwtRefreshTtl: string;
}