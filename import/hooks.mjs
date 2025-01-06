import { resolve as swcResolve } from '@swc-node/register/esm'
export { load } from '@swc-node/register/esm'

const skipSwcSet = new Set(['bn.js'])

export function resolve(specifier, context, nextResolve) {
  if (skipSwcSet.has(specifier)) {
    return nextResolve(specifier, context)
  }
  return swcResolve(specifier, context, nextResolve)
}
