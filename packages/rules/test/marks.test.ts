import { describe, expect, it } from 'vitest'
import { keyStates, markGuess } from '../src/marks'

describe('markGuess', () => {
  it('marks exact, present and absent letters', () => {
    expect(markGuess('stone', 'blunt')).toEqual(['miss', 'near', 'miss', 'ok', 'miss'])
    expect(markGuess('blunt', 'blunt')).toEqual(['ok', 'ok', 'ok', 'ok', 'ok'])
  })
  it('never marks more copies of a letter than the answer holds', () => {
    // answer has one L: the first L is exact, the second is absent
    expect(markGuess('llama', 'label')).toEqual(['ok', 'near', 'near', 'miss', 'miss'])
    // answer has three E: the two exact ones are counted first, the leading E takes the last copy
    expect(markGuess('eerie', 'melee')).toEqual(['near', 'ok', 'miss', 'miss', 'ok'])
    // answer has two E: one is exact, the next guessed E is present, the third is absent
    expect(markGuess('geese', 'level')).toEqual(['miss', 'ok', 'near', 'miss', 'miss'])
    // exact matches are counted before present ones
    expect(markGuess('allay', 'alley')).toEqual(['ok', 'ok', 'ok', 'miss', 'ok'])
  })
})

describe('keyStates', () => {
  it('keeps the best state a letter has earned', () => {
    const states = keyStates([
      { word: 'stone', marks: ['miss', 'near', 'miss', 'near', 'miss'] },
      { word: 'blunt', marks: ['ok', 'ok', 'ok', 'ok', 'ok'] },
    ])
    expect(states.t).toBe('ok')
    expect(states.s).toBe('miss')
    expect(states.b).toBe('ok')
    expect(states.q).toBeUndefined()
  })
})
