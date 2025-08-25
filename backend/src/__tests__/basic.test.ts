describe('Basic functionality', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle dates', () => {
    const date = new Date();
    expect(date).toBeInstanceOf(Date);
  });

  test('should handle strings', () => {
    const message = 'Hello World';
    expect(message).toBe('Hello World');
    expect(message.length).toBe(11);
  });

  test('should handle arrays', () => {
    const currencies = ['NOK', 'CAD', 'USD'];
    expect(currencies).toHaveLength(3);
    expect(currencies).toContain('NOK');
  });
});
