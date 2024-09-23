import {v4 as uuidv4} from "uuid"
import {getAccessToken} from "./auth.mjs"
import pino from "pino"
const logger = pino()

let oauthToken
let tokenExpiryTime

function getBody() {
  const prescriptionUUID = uuidv4();
  const gPSurgery = "Doctors Office A";
  const prescriptionType = "repeatDispensing";
  const repeatNo = 3;
  const nextRepeatDueDate = "2022-01-01";
  const expiryDate = "2022-01-01 23:59:59";
  const patientID = uuidv4();
  const nHSCHI = "9449304130";
  const deliveryType = "Delivery required";
  const oDSCode = "FHA82";
  const currentTimestamp = new Date().toISOString();
  const items = [
    {
      itemID: uuidv4(),
      dMDCode: "319781007",
      dMDDesc: "Aspirin 75mg gastro-resistant tablets",
      uOMDesc: "tablet",
      qty: "99",
      dosage: "Take one daily",
      status: "Pending"
    },
    {
      itemID: uuidv4(),
      dMDCode: "134531009",
      dMDDesc: "Almotriptan 12.5mg tablets",
      uOMDesc: "tablet",
      qty: "12",
      dosage: "As Directed",
      status: "Pending"
    }
  ];

  const body = {
    version: "1.0",
    status: "PatientMatched",
    messageDate: currentTimestamp,  // Using the current timestamp
    prescriptionUUID: prescriptionUUID,  // Generated UUID for prescriptionUUID
    gPSurgery: gPSurgery,
    prescriptionType: prescriptionType,
    repeatNo: repeatNo,
    nextRepeatDueDate: nextRepeatDueDate,
    expiryDate: expiryDate,
    patientID: patientID,  // Generated UUID for patientID
    nHSCHI: nHSCHI,
    deliveryType: deliveryType,
    oDSCode: oDSCode,
    items: items,
    MessageType: "PrescriptionStatusChanged"
  };

  return body;
}

export async function getSharedAuthToken(vuContext) {
  // This checks if we have a valid oauth token and if not gets a new one
  if (!tokenExpiryTime || tokenExpiryTime < Date.now()) {
    logger.info("Token has expired. Fetching new token")
    logger.info(`Current expiry time: ${tokenExpiryTime}`)
    const response = await getAccessToken(logger, vuContext.vars.target)
    tokenExpiryTime = Date.now() + response.expires_in * 1000
    oauthToken = response.access_token
    logger.info(`New expiry time: ${tokenExpiryTime}`)
  } else {
    logger.info("Using cached token")
  }
  vuContext.vars.authToken = oauthToken
}

export async function getCPSUParams(requestParams, vuContext) {
  // This sets the body of the request and some variables so headers are unique
  const body = getBody()
  requestParams.json = body
  vuContext.vars.x_request_id = uuidv4()
  vuContext.vars.x_correlation_id = uuidv4()
}
