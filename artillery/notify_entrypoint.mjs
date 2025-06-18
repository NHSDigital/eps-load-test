import {v4 as uuidv4}   from "uuid"
import pino from "pino"
import {getSharedAuthToken, getBody} from "./helper/psu.mjs"
import {allowedOdsCodes} from "./helper/allowed_odscodes.mjs"

const logger = pino()

const NUM_ODS_CODES = 1000

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";

const randomChar = (chars) => chars[Math.floor(Math.random() * chars.length)];

/** Generate one two-letter, three-digit ODS code, e.g. "AB123" */
const generateOdsCode = () =>
  `${randomChar(LETTERS)}${randomChar(LETTERS)}${randomChar(DIGITS)}${randomChar(DIGITS)}${randomChar(DIGITS)}`;

function buildFullOdsCodes(targetCount, seedCodes) {
  const codes = new Set(seedCodes);

  while (codes.size < targetCount) {
    codes.add(generateOdsCode());
  }

  return Array.from(codes);
}

/** The complete list of 10k ODS codes */
const fullOdsCodes = buildFullOdsCodes(NUM_ODS_CODES, allowedOdsCodes);

function computeCheckDigit(nhsNumber) {
    const factors = [10,9,8,7,6,5,4,3,2]
    let total = 0
    
    for (let i = 0; i < 9; i++) {
        total += parseInt(nhsNumber.charAt(i),10) * factors[i]
    }
    
    const rem = total % 11
    let d = 11 - rem
    if (d === 11) d = 0
    
    return d
}

function generateValidNhsNumber() {
  while (true) {
    const partial = Array.from({length:9},() => Math.floor(Math.random()*10)).join("")
    const cd = computeCheckDigit(partial)
    if (cd < 10) return partial + cd
  }
}

export function initUser(_, vuContext) {
    // Generate data for a patient
    vuContext.vars.odsCode = fullOdsCodes[Math.floor(Math.random()*fullOdsCodes.length)]
    vuContext.vars.nhsNumber = generateValidNhsNumber()

    let prescriptionCount = Math.round(Math.sampleNormal(3,1))
    if (prescriptionCount < 1) prescriptionCount = 1 // just truncate at 1.
    vuContext.vars.prescriptionCount  = prescriptionCount
}

// beforeEach request
export function generatePrescData(requestParams, vuContext) {
  const body = getBody(
    true,                       /* isValid */   
    "ready to collect",         /* status */    
    vuContext.vars.odsCode,     /* odsCode */   
    vuContext.vars.nhsNumber    /* nhsNumber */ 
  )
  
  requestParams.json = body
  vuContext.vars.x_request_id = uuidv4()
  vuContext.vars.x_correlation_id = uuidv4()

  // Wait this long between requests
  let delay = Math.sampleNormal(150, 60)
  if (delay < 0) delay = 0
  vuContext.vars.nextDelay = delay
}

export { getSharedAuthToken }
