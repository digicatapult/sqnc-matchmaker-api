import type { Logger } from 'pino'

import { Controller } from 'tsoa'

import { logger } from '../../../lib/logger.js'
import Database from '../../../lib/db/index.js'

import ChainNode from '../../../lib/chainNode.js'

export class ProxyController extends Controller {
  log: Logger
  db: Database

  constructor(private node: ChainNode) {
    super()

    this.log = logger.child({ controller: `/proxy` })
    this.db = new Database()
  }

  public async createProxyOnChain(
    userUri: string,
    proxyAddress: string,
    proxyType: string = 'RunProcess',
    delay: number = 0
  ) {
    const extrinsic = await this.node.addProxy(
      userUri, // e.g. //Alice
      proxyAddress, //e.g. '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy'
      proxyType,
      delay
    )

    // should we have a transaction locally for creating a proxy?

    // const [transaction] = await this.db.insertTransaction({
    //   api_type: this.dbDemandSubtype,
    //   transaction_type: 'creation',
    //   local_id: demandId,
    //   state: 'submitted',
    //   hash: extrinsic.hash.toHex(),
    // })

    await this.node.submitRunProcessForProxy(extrinsic)

    // return transaction
  }
}

// import { injectable } from 'tsyringe'
// import ChainNode from '../../../lib/chainNode.js'

// import Identity from '../../../lib/services/identity.js'
// import { ValidateError, Post, Route, Response, SuccessResponse, Tags, Security, Path, Body } from 'tsoa'
// import { BadRequest } from '../../../lib/error-handler/index.js'
// import { DemandController } from '../_common/demand.js'

// @Route('v1/proxy')
// @injectable()
// @Tags('proxy')
// @Security('oauth2')
// export class ProxyController extends DemandController {
//   constructor(identity: Identity, node: ChainNode) {
//     super('demandA', identity, node)
//   }
//   // this.log = logger.child({ controller: '/proxy' })
//   // this.db = new Database()

//   /**
//    * A Member adds a proxy which can perform tasks on their behalf
//    * @summary Propose a new match2
//    */
//   //   , @Body() body: AddProxyRequest
//   @Post('{demandId}')
//   @Response<BadRequest>(400, 'Request was invalid')
//   @Response<ValidateError>(422, 'Validation Failed')
//   @SuccessResponse('201')
//   public async addProxy(@Path() demandId: string) {
//     // const res = await this.identity.getMemberBySelf(getAuthorization(req))
//     // const { address: selfAddress } = res
//     return super.createProxyOnChain(
//       demandId,
//       '//Alice',
//       '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
//       'RunProcess',
//       0
//     )
//     // const proxyRes = await this.node.addProxy(
//     //   '//Alice',
//     //   '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
//     //   'RunProcess',
//     //   0
//     // )
//   }
// }
