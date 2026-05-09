const { keyboard, Key } = require('@nut-tree-fork/nut-js');

async function typeText(text) {
  const { default: clipboardy } = await import('clipboardy');
  
  await clipboardy.write(text);
  
  await keyboard.pressKey(Key.LeftControl, Key.V);
  await keyboard.releaseKey(Key.LeftControl, Key.V);
  
  await new Promise(resolve => setTimeout(resolve, 50));
}

module.exports = { typeText };
