import jwt from "jsonwebtoken"
import {v4 as uuidv4} from "uuid"
import axios from "axios"

const privateKey = process.env.psu_private_key

function createSignedJWT(baseTarget) {
  const authURL = `${baseTarget}oauth2/token`
  const header = {
    typ: "JWT",
    alg: "RS512",
    kid: process.env.psu_kid
  }
  const jti_value = uuidv4()

  const currentTimestamp = Math.floor(Date.now() / 1000)
  const data = {
    sub: process.env.psu_api_key,
    iss: process.env.psu_api_key,
    jti: jti_value,
    aud: authURL,
    exp: currentTimestamp + 180 // expiry time is 180 seconds from time of creation
  }

  const signedJWT = jwt.sign(JSON.stringify(data), privateKey, {algorithm: header.alg, header: header})
  return signedJWT
}

export async function getAccessToken(logger, baseTarget) {
  const authURL = `${baseTarget}oauth2/token`
  const signedJWT = createSignedJWT(baseTarget)
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
