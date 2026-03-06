/** VSCode 接口封装 */
import * as vsc from 'vscode';

export { ExtensionContext, window, workspace } from 'vscode';

const outputChannel = vsc.window.createOutputChannel('中文代码补全');

export function log(msg: string) {
    outputChannel.appendLine(`[${new Date().toLocaleString()}] ${msg}`);
}
