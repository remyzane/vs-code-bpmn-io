
import * as vsc from './接口封装';



export abstract class Disposable {
  private _isDisposed = false;

  protected _disposables: vsc.Disposable[] = [];

  public dispose(): any {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    vsc.全部清除(this._disposables);
  }

  protected _register<T extends vsc.Disposable>(value: T): T {
    if (this._isDisposed) {
      value.dispose();
    } else {
      this._disposables.push(value);
    }
    return value;
  }
}
