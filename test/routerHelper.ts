import request from 'supertest'
import express from 'express'

export async function get(app: express.Express, endpoint: string) {
  return request(app)
    .get(endpoint)
    .then((response) => {
      return response
    })
    .catch((err) => {
      return err
    })
}

export async function post(app: express.Express, endpoint: string, body: object) {
  return request(app)
    .post(endpoint)
    .send(body)
    .then((response) => {
      return response
    })
    .catch((err) => {
      return err
    })
}

// export async function postCapacity(app: express.Express, capacity: DemandRequest) {
//   return request(app)
//     .post('/capacity')
//     .send(capacity)
//     .then((response) => {
//       return response
//     })
//     .catch((err) => {
//       return err
//     })
// }
