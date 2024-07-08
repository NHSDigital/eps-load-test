const crypto = require("crypto").webcrypto
function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
  )
}

function generateGUID(request, context, events, next) {
  context.vars.guid = uuidv4()
  return next()
}

module.exports = {
  generateGUID
}
