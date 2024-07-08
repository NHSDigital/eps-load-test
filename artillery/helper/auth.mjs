import jwt from "jsonwebtoken"
import {v4 as uuidv4} from "uuid"
import fs from "fs"
import axios from "axios"
import {dirname} from "path"
import {fileURLToPath} from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const privateKey = fs.readFileSync(`${__dirname}/private.key`, "utf8")
const auth_url = "https://internal-dev.api.service.nhs.uk/oauth2/token"

function createSignedJWT() {
  const header = {
    typ: "JWT",
    alg: "RS512",
    kid: "psu-internal-dev"
  }
  const jti_value = uuidv4()

  const currentTimestamp = Math.floor(Date.now() / 1000)
  const data = {
    sub: process.env.API_KEY,
    iss: process.env.API_KEY,
    jti: jti_value,
    aud: auth_url,
    exp: currentTimestamp + 180 // expiry time is 180 seconds from time of creation
  }

  const signedJWT = jwt.sign(JSON.stringify(data), privateKey, {algorithm: header.alg, header: header})
  return signedJWT
}

export async function getAccessToken() {
  const signedJWT = createSignedJWT()
  const payload = {
    grant_type: "client_credentials",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: signedJWT
  }
  const response = await axios.post(auth_url, payload, {headers: {"content-type": "application/x-www-form-urlencoded"}})
  return response.data
}
