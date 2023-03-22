import { describe, before, test } from 'mocha'
import { Express } from 'express'
import { expect } from 'chai'

import createHttpServer from '../../src/server'
import { get, post, postFile } from '../helper/routeHelper'

import Database from '../../src/lib/db'

const db = new Database().db()

describe('attachment', () => {
  const size = 100
  const blobData = 'a'.repeat(size)
  const filename = 'test.pdf'
  const jsonData = { key: 'test', filename: 'JSON attachment test' }
  let app: Express

  before(async () => {
    app = await createHttpServer()
  })

  afterEach(async () => {
    await db.attachment().del()
  })

  describe('invalid requests', () => {
    test('returns 500 when attempting to retrieve not UUID', async () => {
      const { status, body }= await get(app, '/attachment/not-uuid')

      expect(status).to.equal(500)
      expect(body).to.contain({
        length: 140,
        name: 'error',
        severity: 'ERROR',
        code: '22P02',
        where: "unnamed portal parameter $1 = '...'",
        file: 'uuid.c',
        line: '133',
        routine: 'string_to_uuid',
      })
    })

    test('returns 404 if no records found', async () => {
      const { status, body }= await get(app, '/attachment/00000000-0000-1000-9000-000000000001')

      expect(status).to.equal(404)
      expect(body).to.equal('attachment not found')
    })
  })
  
  describe('uploads and retrieves attachment', () => {
    let octetRes: any
    let jsonRes: any

    beforeEach(async () => {
      octetRes = await postFile(app, '/attachment', Buffer.from(blobData), filename)
      jsonRes = await post(app, '/attachment', jsonData)
    })

    test('confirms JSON and octet attachment uploads', () => {
      // assert octect
      expect(octetRes.status).to.equal(201)
      expect(octetRes.body).to.have.property('id')
      expect(octetRes.body.filename).to.equal(filename)
      expect(octetRes.body.size).to.equal(size)

      // assert JSON
      expect(jsonRes.status).to.equal(201)
      expect(jsonRes.body).to.contain.keys(['id', 'createdAt'])
      expect(jsonRes.body.filename).to.equal('json')
    })

    test('returns octet attachment', async () => {
      const { id } = octetRes.body
      const { status, body, header } = await get(app, `/attachment/${id}`, { accept: 'application/octet-stream' })

      expect(status).to.equal(200)
      expect(body.type).to.equal('Buffer')
      expect(Buffer.from(body.data).toString()).to.equal(blobData)
      expect(header).to.deep.contain({
        immutable: 'true',
        maxage: '31536000000',
        accept: 'application/octet-stream',
        'access-control-expose-headers': 'content-disposition',
        'content-disposition': 'attachment; filename="test.pdf"',
        'content-length': '326',
      })
    })

    test('returns JSON attachment', async () => {
      const { id } = jsonRes.body
      const { status, body } = await get(app, `/attachment/${id}`, { accept: 'application/json' })

      expect(status).to.equal(200)
      expect(body).to.contain(jsonData)
    })

    test('returns octet when JSON.parse fails', async () => {
      const { id } = octetRes.body
      const { status, body, header } = await get(app, `/attachment/${id}`, { accept: 'application/json' })

      expect(status).to.equal(200)
      expect(body.type).to.equal('Buffer')
      expect(Buffer.from(body.data).toString()).to.equal(blobData)
      expect(header).to.deep.contain({
        immutable: 'true',
        maxage: '31536000000',
        accept: 'application/octet-stream',
        'access-control-expose-headers': 'content-disposition',
        'content-disposition': 'attachment; filename="test.pdf"',
        'content-length': '326',
      })
    })
  })


  test('attachment as octect with the filename [json]', async () => {
    const uploadRes = await postFile(app, '/attachment', Buffer.from(blobData), 'json') 
    const { status, body, header } = await get(app, `/attachment/${uploadRes.body.id}`, { accept: 'application/octet-stream' })

    expect(status).to.equal(200)
    expect(body.type).to.equal('Buffer')
    expect(Buffer.from(body.data).toString()).to.equal(blobData)
    expect(header).to.deep.contain({
      immutable: 'true',
      maxage: '31536000000',
      accept: 'application/octet-stream',
      'access-control-expose-headers': 'content-disposition',
      'content-disposition': 'attachment; filename="json"',
      'content-length': '326',
    })
  })
})
