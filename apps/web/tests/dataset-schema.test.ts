import { describe, expect, it } from 'vitest';
import { inferColumnSchema } from '../lib/dataset-schema';

describe('inferColumnSchema', () => {
  it('infers useful column types and missing values from preview rows', () => {
    expect(inferColumnSchema(['id', 'name', 'active'], [['1', 'Ada', 'true'], ['2', '', 'false']])).toEqual([
      { name: 'id', type: 'number', nonEmpty: 2, missing: 0 },
      { name: 'name', type: 'text', nonEmpty: 1, missing: 1 },
      { name: 'active', type: 'boolean', nonEmpty: 2, missing: 0 },
    ]);
  });

  it('marks mixed values as text instead of guessing', () => {
    expect(inferColumnSchema(['value'], [['1'], ['unknown']])).toEqual([
      { name: 'value', type: 'text', nonEmpty: 2, missing: 0 },
    ]);
  });
});
