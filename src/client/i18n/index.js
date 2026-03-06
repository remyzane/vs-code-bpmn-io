
import 中文词典 from './zh';

export default function 中文翻译(原始文本, 变量字典) {
    变量字典 = 变量字典 || {};
    中文文本 = 中文词典[原始文本] || 原始文本;

    // 变量赋值，如：「在 {element} 中没有父元素 {parent}」 + {element: 'xxx', parent: 'yyy'} ->「在 xxx 中没有父元素 yyy」
    return 中文文本.replace(/{([^}]+)}/g, function (_, 变量) {
        return 变量字典[key] || '{' + 变量 + '}';
    });
}
