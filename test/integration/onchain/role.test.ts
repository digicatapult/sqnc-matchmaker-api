import { expect } from 'chai'
import Identity from '../../../src/lib/services/identity.js'
import AuthInternal from '../../../src/lib/services/authInternal.js'
import { container } from 'tsyringe'

describe('Identity Service Roles', () => {
  it('should have only the role Optimiser', async () => {
    const identity = container.resolve<Identity>(Identity)
    const authInternal = container.resolve<AuthInternal>(AuthInternal)
    const token = await authInternal.getInternalAccessToken()
    await identity.updateRole('Optimiser', `bearer ${token}`)
    const roles = await identity.getAllRoles(`bearer ${token}`)
    expect(roles).to.deep.equal(['Optimiser'])
  })
})
