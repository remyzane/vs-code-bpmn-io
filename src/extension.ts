import * as vsc from './接口封装.js';

import { BpmnEditor } from './bpmn-editor.js';

export function activate(context: vsc.ExtensionContext) {
  try {
    vsc.log('BPMN 中文');

    // register our custom editor providers
    context.subscriptions.push(BpmnEditor.register(context));

    vsc.log('插件已启动');
  } catch (e) {
    vsc.window.showInformationMessage('启动失败：' + e);
  }
}
