import jwt from "jsonwebtoken"
import {v4 as uuidv4} from "uuid"
import axios from "axios"


function createSignedJWT(baseTarget, privateKey, api_key, kid) {
  const authURL = `${baseTarget}oauth2/token`
  const header = {
    typ: "JWT",
    alg: "RS512",
    kid: kid
  }
  const jti_value = uuidv4()

  const currentTimestamp = Math.floor(Date.now() / 1000)
  const data = {
    sub: api_key,
    iss: api_key,
    jti: jti_value,
    aud: authURL,
    exp: currentTimestamp + 180 // expiry time is 180 seconds from time of creation
  }

  const signedJWT = jwt.sign(JSON.stringify(data), privateKey, {algorithm: header.alg, header: header})
  return signedJWT
}

export async function getAccessToken(logger, baseTarget, privateKey, api_key, kid) {
  const authURL = `${baseTarget}oauth2/token`
  const signedJWT = createSignedJWT(baseTarget, privateKey, api_key, kid)
  const payload = {
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: signedJWT
  }
  try {
    const response = await axios.post(authURL, payload, {
      headers: {"content-type": "application/x-www-form-urlencoded"}
    })
    return response.data
  } catch (error) {
    logger.error("Got an error")
    logger.error(error.response)
    throw error
  }
}
