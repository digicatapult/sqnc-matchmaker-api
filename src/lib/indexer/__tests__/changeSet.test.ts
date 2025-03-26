import { describe, it } from 'mocha'
import { expect } from 'chai'

import { findIdTestSet } from './fixtures/changeSet.js'
import { AttachmentRecord, DemandRecord, MatchRecord, mergeChangeSets, findLocalIdInChangeSet } from '../changeSet.js'

const mkAttachment: (i: number) => AttachmentRecord = (i) => ({
  type: 'insert',
  id: `${i}`,
  integrityHash: `${i}-hash`,
  ownerAddress: 'alice',
})

const mkDemand: (i: number) => DemandRecord = (i) => ({
  type: 'update',
  id: `${i}`,
  latest_token_id: i,
  state: 'created',
})

const mkMatch2: (i: number) => MatchRecord = (i) => ({
  type: 'update',
  id: `${i}`,
  latest_token_id: i,
  state: 'proposed',
})

describe('changeSet', function () {
  describe('mergeChangeSets', function () {
    it('should return undefined if neither base or update have entries', function () {
      const result = mergeChangeSets({}, {})
      expect(result).to.deep.equal({})
    })

    it('should return base if update is empty', function () {
      const base = {
        attachments: new Map([['123', mkAttachment(1)]]),
        demands: new Map([['123', mkDemand(1)]]),
        matches: new Map([['123', mkMatch2(1)]]),
      }
      const result = mergeChangeSets(base, {})
      expect(result).to.deep.equal(base)
    })

    it('should return update if base is empty', function () {
      const update = {
        attachments: new Map([['123', mkAttachment(1)]]),
        demands: new Map([['123', mkDemand(1)]]),
        matches: new Map([['123', mkMatch2(1)]]),
      }
      const result = mergeChangeSets({}, update)
      expect(result).to.deep.equal(update)
    })

    it('should include entries from base and update when keys are different', function () {
      const update = {
        attachments: new Map([['123', mkAttachment(1)]]),
        demands: new Map([['123', mkDemand(1)]]),
        matches: new Map([['123', mkMatch2(1)]]),
      }
      const base = {
        attachments: new Map([['456', mkAttachment(2)]]),
        demands: new Map([['456', mkDemand(2)]]),
        matches: new Map([['456', mkMatch2(2)]]),
      }
      const result = mergeChangeSets(base, update)
      expect(result).to.deep.equal({
        attachments: new Map([
          ['123', mkAttachment(1)],
          ['456', mkAttachment(2)],
        ]),
        demands: new Map([
          ['123', mkDemand(1)],
          ['456', mkDemand(2)],
        ]),
        matches: new Map([
          ['123', mkMatch2(1)],
          ['456', mkMatch2(2)],
        ]),
      })
    })

    it('should merge update onto base if entries exist in both', function () {
      const update = {
        attachments: new Map([['123', mkAttachment(1)]]),
        demands: new Map([['123', mkDemand(1)]]),
        matches: new Map([['123', mkMatch2(1)]]),
      }
      const base = {
        attachments: new Map([['123', mkAttachment(2)]]),
        demands: new Map([['123', mkDemand(2)]]),
        matches: new Map([['123', mkMatch2(2)]]),
      }
      const result = mergeChangeSets(base, update)
      expect(result).to.deep.equal({
        attachments: new Map([['123', mkAttachment(1)]]),
        demands: new Map([['123', mkDemand(1)]]),
        matches: new Map([['123', mkMatch2(1)]]),
      })
    })
  })

  describe('findLocalIdInChangeSet', function () {
    it("returns null if it can't find tokenId", function () {
      const result = findLocalIdInChangeSet({}, 42)
      expect(result).to.equal(null)
    })

    it('should return id if token appears in demands', function () {
      const result = findLocalIdInChangeSet(findIdTestSet, 42)
      expect(result).to.equal('0x02')
    })

    it('should return id if token appears in matches', function () {
      const result = findLocalIdInChangeSet(findIdTestSet, 43)
      expect(result).to.equal('0x03')
    })
  })
})
