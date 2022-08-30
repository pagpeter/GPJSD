const fastify = require('fastify')({ logger: true })
const axios = require('axios');
const path = require('path');
const deob = require("./deobfuscators.js")

fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '/static'),
  prefix: '',
});

const getRemoteJS = async url => {
    console.log("Requesting remote javascript", url)
    try {
        const res = await axios.get(url)
        return res.data
    } catch (e) {
        console.error(e)
        return null
    }
}

const deobfuscate = (code, opts) => {
    let ast = deob.code_to_ast(code)

    if (opts.unused_code) deob.delete_unused(ast)
    if (opts.hidden_false) deob.deobfuscate_hidden_false(ast)
    if (opts.dot_notation) deob.deobfuscate_object_calls(ast)
    if (opts.actual_value) deob.replace_with_actual_val(ast)
    if (opts.comma_seperated) deob.remove_comma_statements(ast)
    if (opts.concealed_strings) deob.remove_hex_numbers(ast)
    if (opts.dead_else) deob.remove_dead_else(ast)
    if (opts.remove_useless_if) deob.remove_useless_if(ast)
    if (opts.rename_identifiers) deob.rename_identifiers(ast)

    
    const newCode = deob.ast_to_code(ast, opts.remove_comments)
    if (opts.beautify) return deob.beautify_code(newCode)
    return newCode
}

fastify.get('/', async (request, reply) => {
  return reply.sendFile("index.html")
})

fastify.post('/api/deobfuscate', async (request, reply) => {
  const body = JSON.parse(request.body)
  // console.log(body)
  let { code } = body

  if (body.url) {
    code = await getRemoteJS(body.url)
  }
  return {"result": deobfuscate(code, body.chosen)}
})

// Run the server!
const start = async () => {
  try {
    await fastify.listen({ host: "0.0.0.0", port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()