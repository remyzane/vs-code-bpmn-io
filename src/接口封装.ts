/** VSCode 接口封装 */
import * as vsc from 'vscode';
// import { 语言基类, 语言配置表, 通用语言实现, 锚点配置T } from './语言';

export { CancellationToken, commands, CompletionContext, CompletionItem, CompletionList, CustomDocument, CustomEditorProvider, Disposable, EventEmitter, ExtensionContext, languages, Position, TabInputText, TextDocument, Uri, WebviewPanel, window, workspace } from 'vscode';

const outputChannel = vsc.window.createOutputChannel('BPMN 中文');

export function log(msg: string) {
    outputChannel.appendLine(`[${new Date().toLocaleString()}] ${msg}`);
}

export async function 读文件(uri: vsc.Uri): Promise<string> {
    if (uri.scheme === 'untitled') {
        return '';
    }
    return Buffer.from(await vsc.workspace.fs.readFile(uri)).toString('utf8');
}

export async function 写文件(uri: vsc.Uri, text: string): Promise<void> {
    await vsc.workspace.fs.writeFile(uri, Buffer.from(text, 'utf8'));
}

export function 全部清除(可清除对象列表: vsc.Disposable[]): void {
    while (可清除对象列表.length) {
        const 可清除对象 = 可清除对象列表.pop();
        if (可清除对象) {
            可清除对象.dispose();
        }
    }
}
