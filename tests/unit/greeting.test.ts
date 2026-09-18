import { describe, expect, it } from 'vitest';
import { fillGreetingTemplate, partOfDay } from '../../src/lib/widgets/greeting';

describe('partOfDay', () => {
  it.each([
    [0, 'night'],
    [4, 'night'],
    [5, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [19, 'afternoon'],
    [20, 'evening'],
    [22, 'evening'],
    [23, 'night'],
  ])('hour %d -> %s', (hour, expected) => {
    expect(partOfDay(hour)).toBe(expected);
  });
});

describe('fillGreetingTemplate', () => {
  it('substitutes the name as plain text', () => {
    expect(fillGreetingTemplate('Good morning, {name}', 'Ada')).toBe('Good morning, Ada');
  });

  it('leaves no double space or dangling comma with an empty name', () => {
    expect(fillGreetingTemplate('Good morning, {name}', '')).toBe('Good morning');
    expect(fillGreetingTemplate('Good morning, {name}', '   ')).toBe('Good morning');
  });

  it('handles a leading placeholder gracefully', () => {
    expect(fillGreetingTemplate('{name}, welcome back', '')).toBe('welcome back');
  });
});
