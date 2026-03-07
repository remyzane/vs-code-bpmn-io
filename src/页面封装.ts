
import * as vsc from './接口封装';

/**
VSCode 文档关闭不会马上释放缓存：
  1、默认最多缓存 约 5~10 个未激活的文档（具体数量由 VS Code 动态调整），缓存满时，最久未使用的文档会被 dispose
  2、对长时间未再次使用的文档（如 >30 分钟）触发后台清理

dispose 需要清理：
  1、外部资源，如：定时器、WebSocket、文件监听
  2、内部 Disposable 对象（如 WebviewPanel、EventEmitter），且未交给 context.subscriptions
  3、引用了上面两类资源的对象
 */

export abstract class Disposable {
  private 页面已释放 = false;

  protected 可释放对象列表: vsc.Disposable[] = [];

  public 释放页面内容(): any {
    if (this.页面已释放) {
      return;
    }
    this.页面已释放 = true;
    vsc.全部清除(this.可释放对象列表);
  }

  protected 登记可释放对象<T extends vsc.Disposable>(value: T): T {
    if (this.页面已释放) {
      value.dispose();
    } else {
      this.可释放对象列表.push(value);
    }
    return value;
  }
}
