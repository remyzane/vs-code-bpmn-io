declare module 'diagram-js' {
    export interface ViewOptions {
        container: string | HTMLLIElement;
        additionalModules?: any[];
    }

    export class BaseViewer {
        constructor(options?: ViewOptions);
        on(event: string, callback: (...args: any[]) => void): void;
        get<T>(serviceName: string): T;
    }
}
