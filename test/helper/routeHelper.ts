import request from 'supertest'
import express from 'express'

export const get = async (app: express.Express, endpoint: string): Promise<request.Test> => {
  return request(app).get(endpoint)
}

export const post = async (app: express.Express, endpoint: string, body: object): Promise<request.Test> => {
  return request(app).post(endpoint).send(body)
}
