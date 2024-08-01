import {v4 as uuidv4} from "uuid"
import {getAccessToken} from "./auth.mjs"
import pino from "pino"
const logger = pino()

function getBody() {
  const task_identifier = uuidv4()
  const prescriptionOrderItemNumber = uuidv4()
  const nhsNumber = "9449304130"
  const currentTimestamp = new Date().toISOString()
  const odsCode = "C9Z1O"
  const prescriptionID = shortPrescId()
  const status = "in-progress"
  const businessStatus = "With Pharmacy"
  const body = {
    resourceType: "Bundle",
    type: "transaction",
    entry: [
      {
        fullUrl: `urn:uuid:${task_identifier}`,
        resource: {
          resourceType: "Task",
          id: `${task_identifier}`,
          basedOn: [
            {
              identifier: {
                system: "https://fhir.nhs.uk/Id/prescription-order-number",
                value: prescriptionID
              }
            }
          ],
          status: status,
          businessStatus: {
            coding: [
              {
                system: "https://fhir.nhs.uk/CodeSystem/task-businessStatus-nppt",
                code: businessStatus
              }
            ]
          },
          intent: "order",
          focus: {
            identifier: {
              system: "https://fhir.nhs.uk/Id/prescription-order-item-number",
              value: prescriptionOrderItemNumber
            }
          },
          for: {
            identifier: {
              system: "https://fhir.nhs.uk/Id/nhs-number",
              value: nhsNumber
            }
          },
          lastModified: currentTimestamp,
          owner: {
            identifier: {
              system: "https://fhir.nhs.uk/Id/ods-organization-code",
              value: odsCode
            }
          }
        },
        request: {
          method: "POST",
          url: "Task"
        }
      }
    ]
  }
  return body
}

function shortPrescId() {
  const _PRESC_CHECKDIGIT_VALUES = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ+"
  const hexString = uuidv4().replace(/-/g, "").toUpperCase()
  const first = hexString.substring(0, 6)
  const middle = "A12345"
  const last = hexString.substring(12, 17)
  let prescriptionID = `${first}-${middle}-${last}`
  const prscID = prescriptionID.replace(/-/g, "")
  const prscIDLength = prscID.length
  let runningTotal = 0
  const strings = prscID.split("")
  strings.forEach((character, index) => {
    runningTotal = runningTotal + parseInt(character, 36) * 2 ** (prscIDLength - index)
  })
  const checkValue = (38 - (runningTotal % 37)) % 37
  const checkDigit = _PRESC_CHECKDIGIT_VALUES.substring(checkValue, checkValue + 1)
  prescriptionID += checkDigit
  return prescriptionID
}

export function hasValidToken(vuContext, next) {
  const continueLooping = vuContext.tokenExpiryTime > Date.now()
  // While `continueLooping` is true, the `next` function will
  // continue the loop in the test scenario.
  return next(continueLooping)
}

export async function getPSUParams(requestParams, vuContext, events) {
  logger.info(vuContext.vars.target)
  if (!vuContext.tokenExpiryTime || vuContext.tokenExpiryTime < Date.now()) {
    logger.info("Fetching new token")
    logger.info(`  current expiry time: ${vuContext.tokenExpiryTime}`)
    const response = await getAccessToken(logger, vuContext.vars.target)
    vuContext.tokenExpiryTime = Date.now() + response.expires_in * 1000
    vuContext.vars.authToken = response.access_token
    logger.info(`  new expiry time: ${vuContext.tokenExpiryTime}`)
    logger.info(`  new token: ${vuContext.vars.authToken}`)
  } else {
    logger.info("  using cached token")
  }
  const body = getBody()
  requestParams.json = body
  vuContext.vars.x_request_id = uuidv4()
  vuContext.vars.x_correlation_id = uuidv4()
}
