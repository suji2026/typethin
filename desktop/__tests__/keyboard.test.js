jest.mock('@nut-tree-fork/nut-js', () => ({
  keyboard: { type: jest.fn() }
}));

const { typeText } = require('../keyboard');
const { keyboard } = require('@nut-tree-fork/nut-js');

describe('typeText', () => {
  it('calls nut-js keyboard.type with the text', async () => {
    await typeText('你好');
    expect(keyboard.type).toHaveBeenCalledWith('你好');
  });

  it('handles empty string', async () => {
    await typeText('');
    expect(keyboard.type).toHaveBeenCalledWith('');
  });

  it('handles special characters', async () => {
    await typeText('test@email.com');
    expect(keyboard.type).toHaveBeenCalledWith('test@email.com');
  });
});
