declare module 'bpmn-js/lib/Modeler' {
    import { BaseViewer, ViewOptions } from 'diagram-js';

    class BpmnModeler extends BaseViewer {
        constructor(options?: ViewOptions);
        importXML(xml: string): Promise<{ warnings: any[] }>;
        saveXML(options?: { format?: boolean }): Promise<{ xml: string }>;
        createDiagram(): Promise<void>;
        on(event: string, callback: (...args: any[]) => void): void;
        get<T>(serviceName: string): T;
    }

    export default BpmnModeler;
}

// 其他你需要的模块（按需添加）
declare module 'bpmn-js-color-picker' {
    const BpmnColorPickerModule: any;
    export default BpmnColorPickerModule;
}