const { keyboard, Key } = require('@nut-tree-fork/nut-js');

async function typeText(text) {
  // 动态导入 clipboardy (ESM 模块)
  const { default: clipboardy } = await import('clipboardy');
  
  // 保存原始剪贴板内容
  const originalClipboard = await clipboardy.read().catch(() => '');
  
  try {
    // 将文本写入剪贴板
    await clipboardy.write(text);
    
    // 模拟 Ctrl+V 粘贴
    await keyboard.pressKey(Key.LeftControl, Key.V);
    await keyboard.releaseKey(Key.LeftControl, Key.V);
    
    // 等待一小段时间确保粘贴完成
    await new Promise(resolve => setTimeout(resolve, 50));
  } finally {
    // 恢复原始剪贴板内容
    await clipboardy.write(originalClipboard).catch(() => {});
  }
}

module.exports = { typeText };
