export interface Health {
  status: string
  version: string
  details: {
    [k: string]: {
      status: string
      detail: string
    }
  }
}
