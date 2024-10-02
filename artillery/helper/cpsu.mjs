import {v4 as uuidv4} from "uuid"
import pino from "pino"
const logger = pino()

let oauthToken
let tokenExpiryTime

export function getBody(isValid = true) {
  // If this is intended to be a failed request, mangle the prescription ID.
  const prescriptionUUID = isValid ? shortPrescId() : invalidShortPrescId();
  
  const task_identifier = uuidv4()
  const gPSurgery = "Doctors Office A";
  const prescriptionType = "repeatDispensing";
  const repeatNo = 3;
  const nextRepeatDueDate = "2022-01-01";
  const expiryDate = "2022-01-01 23:59:59";
  const patientID = getPatientId();
  const nHSCHI = "9449304130";
  const deliveryType = "Delivery required";
  const oDSCode = "FHA82";
  const currentTimestamp = new Date().toISOString();
  const items = [
    {
      itemID: task_identifier,
      dMDCode: "319781007",
      dMDDesc: "Aspirin 75mg gastro-resistant tablets",
      uOMDesc: "tablet",
      qty: "99",
      dosage: "Take one daily",
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

function getPatientId() {
    // Generate IDs of the format "XXXXX-XXXXXX", where X are all numbers
    const first = Math.floor(10000 + Math.random() * 90000);
    const second = Math.floor(100000 + Math.random() * 900000);
    return `${first}-${second}`;
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
  
function invalidShortPrescId() {
  // Generate an invalid prescription ID by removing the last character
  let invalidId = shortPrescId();
  invalidId = invalidId.slice(0, -1); // Remove last character to invalidate
  return invalidId;
}

export async function getSharedAuthToken(vuContext) {
  vuContext.vars.apiKey = process.env.cpsu_api_key
}

export async function getCPSUParams(requestParams, vuContext) {
  // Some requests are intended to be invalid ones. 
  // Check if this request is supposed to be valid, and fetch an appropriate body
  const isValid = vuContext.scenario.tags.isValid
  const body = getBody(isValid)

  requestParams.json = body
  // This sets the body of the request and some variables so headers are unique
  vuContext.vars.x_request_id = uuidv4()
  vuContext.vars.x_correlation_id = uuidv4()
}
