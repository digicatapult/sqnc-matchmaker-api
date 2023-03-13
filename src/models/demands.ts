export interface Demand {
  id: string
  owner: string
  subtype: 'Order' | 'Capacity'
  status: 'Created' | 'Allocated'
}
