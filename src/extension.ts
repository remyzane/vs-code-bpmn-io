import * as vscode from 'vscode';

import { BPMN编辑器 } from './编辑器';

export function activate(context: vscode.ExtensionContext) {

  // register our custom editor providers
  context.subscriptions.push(BPMN编辑器.register(context));
}
