import { BPMN文档, BPMN文档集合类 } from './BPMN文档';
import * as vsc from './接口封装';

/**
 * Provider for visual BPMN editing.
 */
export class BPMN编辑器 implements vsc.CustomEditorProvider<BPMN文档> {

    private static newFileId = 1;

    public static register(context: vsc.ExtensionContext): vsc.Disposable {

        return vsc.window.registerCustomEditorProvider(
            BPMN编辑器.viewType,
            new BPMN编辑器(context),
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsMultipleEditorsPerDocument: false
            }
        );
    }

    private readonly log = vsc.window.createOutputChannel('BPMN Editor');

    private static readonly viewType = 'bpmn-io.bpmnEditor';

    /**
     * Tracks all known webviews
     */
    private readonly webviews = new vsc.WebviewCollection();

    /**
     * Tracks all known documents
     */
    private readonly documents = new BPMN文档集合类();

    constructor(
        private readonly _context: vsc.ExtensionContext
    ) {

        _context.subscriptions.push(
            vsc.commands.registerCommand('bpmn-io.bpmnEditor.__state', (uri: vsc.Uri) => {

                const document = this.documents.get(uri);

                if (!document) {
                    return null;
                }

                const webviews = Array.from(this.webviews.get(document.uri));

                return {
                    document,
                    webviewPanel: webviews[0]
                };
            }),
            vsc.window.tabGroups.onDidChangeTabs(({ opened, changed }) => {

                const tabs = [...opened, ...changed];
                const active = tabs.find(tab => tab.isActive);
                const uri = (active?.input as vsc.TabInputText)?.uri;
                const webviews = Array.from(this.webviews.get(uri));

                if (!webviews.length) return;

                this.restoreFocusOnCanvas(webviews[0]);
            })
        );
    }

    // #region CustomEditorProvider

    async openCustomDocument(
        uri: vsc.Uri,
        openContext: { backupId?: string },
        _token: vsc.CancellationToken
    ): Promise<BPMN文档> {
        const document: BPMN文档 = await BPMN文档.create(uri, openContext.backupId, {
            getText: async () => {
                const webviewsForDocument = Array.from(this.webviews.get(document.uri));
                if (!webviewsForDocument.length) {
                    throw new Error('Could not find webview to save for');
                }
                const panel = webviewsForDocument[0];
                const response = await this.postMessageWithResponse<number[]>(panel, 'getText', {});
                return String(response);
            }
        });

        const listeners: vsc.Disposable[] = [];

        listeners.push(document.onDidChange(e => {

            // indicate that the document has been changed
            this._onDidChangeCustomDocument.fire({
                document,
                ...e,
            });
        }));

        listeners.push(document.onDidChangeContent(e => {

            // Update all webviews when the document changes
            for (const webviewPanel of this.webviews.get(document.uri)) {
                this.postMessage(webviewPanel, 'update', {
                    undo: e.undo,
                    redo: e.redo,
                    content: e.content
                });
            }
        }));

        document.onDidDispose(() => vsc.全部清除(listeners));

        // track documents

        this.documents.add(uri, document);

        document.onDidDispose(() => this.documents.remove(document.uri));

        return document;
    }

    async resolveCustomEditor(
        document: BPMN文档,
        webviewPanel: vsc.WebviewPanel,
        _token: vsc.CancellationToken
    ): Promise<void> {

        // add the webview to our internal set of active webviews
        this.webviews.add(document.uri, webviewPanel);

        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, e));

        webviewPanel.webview.onDidReceiveMessage(e => {
            if (e.type === 'ready') {
                if (document.uri.scheme === 'untitled') {
                    this.postMessage(webviewPanel, 'init', {
                        untitled: true,
                        editable: true,
                    });
                } else {
                    const editable = vsc.workspace.fs.isWritableFileSystem(document.uri.scheme);

                    this.postMessage(webviewPanel, 'init', {
                        content: document.getText(),
                        editable,
                    });
                }
            }
        });

        webviewPanel.onDidChangeViewState(async e => {
            if (!e.webviewPanel.active) {
                return;
            }

            const content = await vsc.读文件(document.uri);

            if (content !== document.getText()) {
                const action = await vsc.window.showInformationMessage(
                    'Diagram changed externally, do you want to reload it?',
                    'Reload'
                );

                if (action === 'Reload') {
                    await document.reset(content);
                }
            }
        });
    }

    private readonly _onDidChangeCustomDocument = new vsc.EventEmitter<vsc.CustomDocumentEditEvent<BPMN文档>>();
    public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

    public saveCustomDocument(document: BPMN文档, cancellation: vsc.CancellationToken): Thenable<void> {
        return document.save(cancellation);
    }

    public saveCustomDocumentAs(document: BPMN文档, destination: vsc.Uri, cancellation: vsc.CancellationToken): Thenable<void> {
        return document.saveAs(destination, cancellation);
    }

    public revertCustomDocument(document: BPMN文档, cancellation: vsc.CancellationToken): Thenable<void> {
        return document.revert(cancellation);
    }

    public backupCustomDocument(document: BPMN文档, context: vsc.CustomDocumentBackupContext, cancellation: vsc.CancellationToken): Thenable<vsc.CustomDocumentBackup> {
        return document.backup(context.destination, cancellation);
    }

    // #endregion

    /**
     * Restore focus on the modeling canvas. Enables keyboard shortcuts.
     */
    private restoreFocusOnCanvas(webviewPanel: vsc.WebviewPanel) {
        vsc.commands.executeCommand('workbench.action.focusActiveEditorGroup');

        this.postMessage(webviewPanel, 'focusCanvas');
    }

    /**
     * Get the static HTML used for in our editor's webviews.
     */
    private getHtmlForWebview(webview: vsc.Webview): string {

        // local path to script and css for the webview
        const scriptUri = webview.asWebviewUri(vsc.Uri.joinPath(
            this._context.extensionUri, 'out/client', 'bpmn-editor.js'));

        const styleResetUri = webview.asWebviewUri(vsc.Uri.joinPath(
            this._context.extensionUri, 'media', 'reset.css'));

        const styleVSCodeUri = webview.asWebviewUri(vsc.Uri.joinPath(
            this._context.extensionUri, 'media', 'vsc.css'));

        const styleMainUri = webview.asWebviewUri(vsc.Uri.joinPath(
            this._context.extensionUri, 'out/client', 'bpmn-editor.css'));

        // use a nonce to whitelist which scripts can be run
        const nonce = getNonce();

        return /* html */`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">

        <!--
        Use a content security policy to only allow loading images from https or from our extension directory,
        and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src https: 'self' data:; img-src ${webview.cspSource} blob:; style-src 'unsafe-inline' https: ${webview.cspSource}; script-src 'nonce-${nonce}';">

        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <link href="${styleResetUri}" rel="stylesheet" />
        <link href="${styleVSCodeUri}" rel="stylesheet" />
        <link href="${styleMainUri}" rel="stylesheet" />

        <title>BPMN Editor</title>
      </head>
      <body>
        <div id="canvas"></div>

        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
    }

    private _requestId = 1;
    private readonly _callbacks = new Map<number, (response: any) => void>();

    private postMessageWithResponse<R = unknown>(panel: vsc.WebviewPanel, type: string, body: any): Promise<R> {
        const requestId = this._requestId++;
        const p = new Promise<R>(resolve => this._callbacks.set(requestId, resolve));
        panel.webview.postMessage({ type, requestId, body });
        return p;
    }

    private postMessage(panel: vsc.WebviewPanel, type: string, body: any = {}): void {
        panel.webview.postMessage({ type, body });
    }

    private onMessage(document: BPMN文档, message: any) {
        switch (message.type) {
            case 'change':
                return document.makeEdit(message as vsc.编辑事件信息体);

            case 'import':

                if (message.error) {
                    this.log.appendLine(`${document.uri.fsPath} - ${message.error}`);
                }

                for (const warning of message.warnings) {
                    this.log.appendLine(`${document.uri.fsPath} - ${warning}`);
                }

                if (message.error || message.warnings.length) {
                    this.log.show(true);
                }

                return document.makeEdit(message as vsc.编辑事件信息体);

            case 'response':
                return (
                    this._callbacks.get(message.requestId)
                )?.(message.body);

            case 'canvas-focus-change':
                vsc.commands.executeCommand('setContext', 'bpmn-io.bpmnEditor.canvasFocused', message.value);
                return;

        }
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
