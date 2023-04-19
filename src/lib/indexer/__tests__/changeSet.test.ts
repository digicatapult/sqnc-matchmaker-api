import { describe, it } from 'mocha'
import { expect } from 'chai'

import { mergeChangeSets } from '../changeSet'

describe('changeSet', function () {
  describe('mergeChangeSets', function () {
    it('should return undefined if neither base or update have entries', function () {
      const result = mergeChangeSets({}, {})
      expect(result).to.deep.equal({})
    })

    it('should return base if update is empty', function () {
      const base = {
        demands: new Map([['123', { id: '42' }]]),
        matches: new Map([['123', { id: '43' }]]),
      }
      const result = mergeChangeSets(base, {})
      expect(result).to.deep.equal(base)
    })

    it('should return update if base is empty', function () {
      const update = {
        demands: new Map([['123', { id: '42' }]]),
        matches: new Map([['123', { id: '43' }]]),
      }
      const result = mergeChangeSets({}, update)
      expect(result).to.deep.equal(update)
    })

    it('should include entries from base and update when keys are different', function () {
      const update = {
        demands: new Map([['123', { id: '42' }]]),
        matches: new Map([['123', { id: '43' }]]),
      }
      const base = {
        demands: new Map([['456', { id: '44' }]]),
        matches: new Map([['456', { id: '45' }]]),
      }
      const result = mergeChangeSets(base, update)
      expect(result).to.deep.equal({
        demands: new Map([
          ['123', { id: '42' }],
          ['456', { id: '44' }],
        ]),
        matches: new Map([
          ['123', { id: '43' }],
          ['456', { id: '45' }],
        ]),
      })
    })

    it('should merge update onto base if entries exist in both', function () {
      const update = {
        demands: new Map([['123', { id: '42' }]]),
        matches: new Map([['123', { id: '43' }]]),
      }
      const base = {
        demands: new Map([['123', { id: '44' }]]),
        matches: new Map([['123', { id: '45' }]]),
      }
      const result = mergeChangeSets(base, update)
      expect(result).to.deep.equal({
        demands: new Map([['123', { id: '42' }]]),
        matches: new Map([['123', { id: '43' }]]),
      })
    })
  })
})
