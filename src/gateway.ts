/* Copyright © 2021-2023 Richard Rodger, MIT License. */


import Seneca from 'seneca'

const { Open, Skip } = Seneca.valid


// Seneca action result.
type GatewayResult = {

  // The action result (transport externalized).
  // OR: a description of the error.
  out: any | {

    // Externalized meta.
    meta$: any

    // Extracted from Error object
    error$: {
      name: string
      id: string
      code?: string
      message?: string
      details?: any
    }
  }

  // Indicate if result was an error.
  error: boolean

  // Original meta object.
  meta?: any

  // Gateway directives embedded in action result.
  // NOTE: $ suffix as output directive.
  gateway$?: Record<string, any>
}


// See defaults below for behaviour.
type GatewayOptions = {
  allow: Record<string, boolean | (string | object)[]>
  custom: any
  fixed: any
  timeout: {
    client: boolean
    max: number
  }
  error: {
    message: boolean
    details: boolean
  }
  debug: {
    response: boolean
    log: boolean
  }
}


function gateway(this: any, options: GatewayOptions) {
  let seneca: any = this
  const root: any = seneca.root
  const tu: any = seneca.export('transport/utils')

  const Patrun = seneca.util.Patrun
  const Jsonic = seneca.util.Jsonic
  const allowed = new Patrun({ gex: true })
  const errid = seneca.util.Nid({ length: 9 })

  const checkAllowed = null != options.allow

  if (checkAllowed) {
    for (let msgCanon in options.allow) {
      let msgCanonObj = Jsonic(msgCanon)
      let paramPats = options.allow[msgCanon]
      let paramPatObjs

      let paramAllowed = false

      if (true === paramPats) {
        paramAllowed = true
      }
      else if (Array.isArray(paramPats)) {
        paramPatObjs = paramPats.map(pp => Jsonic(pp))
        paramAllowed = 0 < paramPatObjs.length ?
          paramPatObjs.reduce((patrun: typeof Patrun, pp: object) =>
            (patrun.add(pp, JSON.stringify(pp).replace(/"/g, ''))), new Patrun({ gex: true })) :
          true
      }

      if (options.debug.log) {
        root.log.debug('gateway-allow-pattern', msgCanonObj, paramPatObjs)
      }

      allowed.add(msgCanonObj, paramAllowed)
    }
  }


  const hooknames = [

    // Functions to modify the custom object in Seneca message meta$ descriptions
    'custom',

    // Functions to modify the fixed arguments to Seneca messages
    'fixed',

    // Functions to modify the seneca request delegate
    'delegate',

    // TODO: rename: before
    // Functions to modify the action or message
    'action',

    // TODO: rename: after
    // Functions to modify the result
    'result'
  ]

  const hooks: any = hooknames.reduce((a: any, n) => (a[n] = [], a), {})

  const tag = seneca.plugin.tag
  if (null != tag && '-' !== tag) {
    seneca = seneca.fix({ tag })
  }


  seneca.message('sys:gateway,add:hook', async function add_hook(msg: any) {
    let hook: string = msg.hook
    let action: (...params: any[]) => any = msg.action

    if (null != action) {
      let hookactions = hooks[hook]
      hookactions.push(action)
      return { ok: true, hook, count: hookactions.length }
    }
    else {
      // TODO: this should fail, as usually a startup action
      // this.throw('no-action', {hook})
      return { ok: false, why: 'no-action' }
    }
  })


  seneca.message('sys:gateway,get:hooks', async function get_hook(msg: any) {
    let hook: string = msg.hook
    let hookactions = hooks[hook]
    return { ok: true, hook, count: hookactions.length, hooks: hookactions }
  })


  // Handle inbound JSON, converting it into a message, and submitting to Seneca.
  async function handler(json: any, ctx?: any) {
    if (options.debug.log) {
      root.log.debug('gateway-handler-json', { json })
    }

    const gateway$ = ctx?.gateway$ || {}
    const seneca = await prepare(json, ctx)
    const rawmsg = tu.internalize_msg(seneca, json)
    const msg = seneca.util.clean(rawmsg)

    // Clients can set a custom timeout, up to a maximum.
    if (options.timeout.client && null != rawmsg.timeout$) {
      let clientTimeout = +rawmsg.timeout$
      let maxTimeout = options.timeout.max
      maxTimeout = 0 < maxTimeout ? maxTimeout : seneca.options().timeout
      if (clientTimeout <= maxTimeout) {
        msg.timeout$ = clientTimeout
      }
    }

    return await new Promise(async (resolve) => {
      if (checkAllowed) {
        let allowMsg = false
        let allowParams = null


        // First, find msg that will be called
        let msgdef = seneca.find(msg)

        if (msgdef) {
          // Second, check found msg matches allowed patterns
          // NOTE: just doing allowed.find(msg) will enable separate messages
          // to sneak in: if foo:1 is allowed but not defined, foo:1,role:seneca,...
          // will still work, which is not what we want! However we also need
          // to check that any additional message parameters not in the msg canon also match.
          allowParams = allowed.find(msgdef.msgcanon)
        }
        else {
          seneca.log.debug('msg-not-found', { msg })
        }


        if (true === allowParams) {
          allowMsg = true
        }
        else if (allowParams?.find) {
          allowMsg = allowParams.find(msg)
        }


        if (!allowMsg) {
          let errdesc: any = {
            name: 'Error',
            id: errid(),
            code: 'not-allowed',
            message: 'Message not allowed',
            allowed: undefined,
          }

          if (options.debug.response) {
            errdesc.pattern = msgdef ? msgdef.pattern : undefined
            errdesc.allowed = msgdef ? allowMsg : undefined
          }

          if (options.debug.log) {
            seneca.log.debug('handler-not-allowed',
              { allowMsg, pattern: msgdef?.pattern, errdesc, msgdef, msg })
          }

          return resolve({
            error: true,

            // Follow seneca transport structure
            out: {
              ...nundef(errdesc),

              meta$: {
                id: rawmsg.id$,
                error: true
              },

              // DEPRECATED: backwards compat
              error$: nundef(errdesc)
            }
          })
        }
        else {
          if (options.debug.log) {
            seneca.log.debug('handler-allowed', { pattern: msgdef.pattern, params: allowMsg })
          }
        }
      }

      let out = null
      for (var i = 0; i < hooks.action.length; i++) {
        out = await hooks.action[i].call(seneca, msg, ctx)
        if (out) {
          if (options.debug.log) {
            seneca.log.debug('handler-hook-action', { out, msg })
          }
          return resolve(out)
        }
      }

      if (options.debug.log) {
        seneca.log.debug('handler-act', { msg })
      }

      if (gateway$.local) {
        msg.local$ = true
      }

      seneca.act(msg, async function(this: any, err: any, out: any, meta: any) {
        for (var i = 0; i < hooks.result.length; i++) {
          await hooks.result[i].call(seneca, out, msg, err, meta, ctx)
        }

        if (err && !options.debug.response) {
          err.stack = null
        }

        out = tu.externalize_reply(this, err, out, meta)

        // Don't expose internal activity unless debugging
        if (!options.debug.response) {
          if (out.meta$) {
            out.meta$ = {
              id: out.meta$.id
            }
          }
        }

        let result: GatewayResult = {
          error: false,
          out,
          meta,
          gateway$: out.gateway$ || {}
        }

        // Directives in gateway$ moved to result
        delete out.gateway$

        if (err) {
          result.error = true
          out.meta$.error = true

          result.out = nundef({
            meta$: out.meta$,
            name: err.name,
            id: (err as any).id || errid(),
            code: (err as any).code,
            message: options.error.message ? err.message : undefined,
            details: options.error.details ? err.details : undefined,
          })
        }

        resolve(result)
      })
    })
  }


  async function prepare(json: any, ctx: any) {
    let i, hookaction

    let custom: any = seneca.util.deep({}, options.custom)
    for (i = 0; i < hooks.custom.length; i++) {
      hookaction = hooks.custom[i]
      if ('object' === typeof (hookaction)) {
        custom = seneca.util.deep(custom, hookaction)
      }
      else {
        await hookaction(custom, json, ctx)
      }
    }


    let fixed: any = seneca.util.deep({}, options.fixed)
    for (i = 0; i < hooks.fixed.length; i++) {
      hookaction = hooks.fixed[i]
      if ('object' === typeof (hookaction)) {
        fixed = seneca.util.deep(fixed, hookaction)
      }
      else {
        await hookaction(fixed, json, ctx)
      }
    }

    if (options.debug.log) {
      root.log.debug('gateway-delegate-params', { fixed, custom })
    }

    // NOTE: a new delegate is created for each request to ensure isolation.
    const delegate = root.delegate(fixed, { custom: custom })

    for (i = 0; i < hooks.delegate.length; i++) {
      await hooks.delegate[i].call(delegate, json, ctx)
    }

    return delegate
  }


  function parseJSON(data: any) {
    if (null == data) return {}

    let str = String(data)

    try {
      return JSON.parse(str)
    } catch (e: any) {
      e.handler$ = {
        error$: e.message,
        input$: str,
      }
      return e
    }
  }

  return {
    exports: {
      prepare,
      handler,
      parseJSON,
    }
  }
}


function nundef(o: any) {
  for (let p in o) {
    if (undefined === o[p]) {
      delete o[p]
    }
  }
  return o
}


// Default options.
gateway.defaults = ({

  // Keys are pattern strings.
  allow: Skip(Open({})),

  // Add custom meta data values.
  custom: Open({

    // Assume gateway is used to handle external messages.
    safe: false
  }),

  // Set request delegate fixed values.
  fixed: Open({}),

  // Allow clients to set a custom timeout (using the timeout$ directive).
  timeout: {

    // Clients can set a custom timeout.
    client: false,

    // Maximum value of client-set timeout.
    // Default is same as Seneca delegate.
    max: -1
  },

  error: {
    // Include exception object message property in response.
    message: false,

    // Include exception object details property in response.
    details: false,
  },


  // Control debug output.
  debug: {

    // When true, errors will include stack trace and other meta data.
    response: false,

    // Produce detailed debug logging.
    log: false,
  }
} as GatewayOptions)


export type {
  GatewayOptions,
  GatewayResult,
}

export default gateway

if ('undefined' !== typeof (module)) {
  module.exports = gateway
}
