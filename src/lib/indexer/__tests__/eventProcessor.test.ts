import { describe, it } from 'mocha'

import eventProcessors from '../eventProcessor'
import { expect } from 'chai'
import { Transaction } from '../../db'

describe('eventProcessor', function () {
  describe('demand-create', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['demand-create'](0, null, [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should return update to demand if transaction exists', function () {
      const result = eventProcessors['demand-create'](
        1,
        { localId: '42' } as Transaction,
        [],
        [{ id: 1, roles: new Map(), metadata: new Map() }]
      )

      expect(result).to.deep.equal({
        demands: new Map([
          ['42', { type: 'update', id: '42', state: 'created', latest_token_id: 1, original_token_id: 1 }],
        ]),
      })
    })

    it("should return new attachment and demand if transaction doesn't exist", function () {
      const result = eventProcessors['demand-create'](
        1,
        null,
        [],
        [
          {
            id: 1,
            roles: new Map([['owner', '123']]),
            metadata: new Map([
              ['parameters', 'a'],
              ['subtype', 'demand_b'],
            ]),
          },
        ]
      )

      expect(result.attachments?.size).to.equal(1)
      const [[attachmentId, attachment]] = [...(result.attachments || [])]
      expect(attachment).to.deep.equal({
        type: 'insert',
        id: attachmentId,
        ipfs_hash: 'a',
      })

      expect(result.demands?.size).to.equal(1)
      const [[demandId, demand]] = [...(result.demands || [])]
      expect(demand).to.deep.equal({
        type: 'insert',
        id: demandId,
        owner: '123',
        subtype: 'demand_b',
        state: 'created',
        parameters_attachment_id: attachmentId,
        latest_token_id: 1,
        original_token_id: 1,
      })
    })
  })

  describe('match2-propose', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2-propose'](0, null, [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should return update to demand if transaction exists', function () {
      const result = eventProcessors['match2-propose'](
        1,
        { localId: 'id_42' } as Transaction,
        [
          { id: 1, localId: 'id_1' },
          { id: 2, localId: 'id_2' },
        ],
        [
          { id: 3, roles: new Map(), metadata: new Map() },
          { id: 4, roles: new Map(), metadata: new Map() },
          { id: 5, roles: new Map(), metadata: new Map() },
        ]
      )

      expect(result).to.deep.equal({
        demands: new Map([
          ['id_1', { type: 'update', id: 'id_1', state: 'created', latest_token_id: 3 }],
          ['id_2', { type: 'update', id: 'id_2', state: 'created', latest_token_id: 4 }],
        ]),
        matches: new Map([
          ['id_42', { type: 'update', id: 'id_42', state: 'proposed', latest_token_id: 5, original_token_id: 5 }],
        ]),
      })
    })

    it('should return update to demands and new match if transaction does not exist', function () {
      const result = eventProcessors['match2-propose'](
        1,
        null,
        [
          { id: 1, localId: 'id_1' },
          { id: 2, localId: 'id_2' },
        ],
        [
          { id: 3, roles: new Map(), metadata: new Map() },
          { id: 4, roles: new Map(), metadata: new Map() },
          {
            id: 5,
            roles: new Map([
              ['optimiser', 'o'],
              ['membera', 'a'],
              ['memberb', 'b'],
            ]),
            metadata: new Map([
              ['demandA', 'da'],
              ['demandB', 'db'],
            ]),
          },
        ]
      )

      expect(result.demands).to.deep.equal(
        new Map([
          ['id_1', { type: 'update', id: 'id_1', state: 'created', latest_token_id: 3 }],
          ['id_2', { type: 'update', id: 'id_2', state: 'created', latest_token_id: 4 }],
        ])
      )

      expect(result.matches?.size).to.equal(1)
      const [[matchId, match]] = [...(result.matches || [])]
      expect(match).to.deep.equal({
        type: 'insert',
        id: matchId,
        optimiser: 'o',
        member_a: 'a',
        member_b: 'b',
        state: 'proposed',
        demand_a_id: 'id_1',
        demand_b_id: 'id_2',
        latest_token_id: 5,
        original_token_id: 5,
      })
    })
  })

  describe('match2-accept', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2-accept'](0, null, [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should update the state of the match2 to match output', function () {
      const result = eventProcessors['match2-accept'](
        1,
        null,
        [{ id: 1, localId: 'id_1' }],
        [{ id: 2, roles: new Map(), metadata: new Map([['state', 'acceptedA']]) }]
      )

      expect(result).to.deep.equal({
        matches: new Map([['id_1', { type: 'update', id: 'id_1', state: 'acceptedA', latest_token_id: 2 }]]),
      })
    })
  })

  describe('match2-acceptFinal', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2-acceptFinal'](0, null, [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should update the states of the match2 and demands', function () {
      const result = eventProcessors['match2-acceptFinal'](
        1,
        null,
        [
          { id: 1, localId: 'id_1' },
          { id: 2, localId: 'id_2' },
          { id: 3, localId: 'id_3' },
        ],
        [
          { id: 4, roles: new Map(), metadata: new Map() },
          { id: 5, roles: new Map(), metadata: new Map() },
          { id: 6, roles: new Map(), metadata: new Map() },
        ]
      )

      expect(result).to.deep.equal({
        demands: new Map([
          ['id_1', { type: 'update', id: 'id_1', state: 'allocated', latest_token_id: 4 }],
          ['id_2', { type: 'update', id: 'id_2', state: 'allocated', latest_token_id: 5 }],
        ]),
        matches: new Map([['id_3', { type: 'update', id: 'id_3', state: 'acceptedFinal', latest_token_id: 6 }]]),
      })
    })
  })
})
