import {v4 as uuidv4}   from "uuid"
import pino from "pino"
import {getSharedAuthToken, getBody} from "./helper/psu.mjs"
import {allowedOdsCodes, blockedOdsCodes} from "./helper/odscodes.mjs"

export { getSharedAuthToken }

const logger = pino()

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

// The complete list of ODS codes
const fullOdsCodes = allowedOdsCodes.concat(blockedOdsCodes)

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

// Apparently Math.sampleNormal isn't a function? Do a quick Box-Muller transform instead
function sampleNormal(mean = 0, sd = 1) {
  let u = 0, v = 0;
  // avoid zeros because of log(0)
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return z * sd + mean;
}

export function initUser(context, events, done) {
    // Generate data for a patient
    context.vars.odsCode = fullOdsCodes[Math.floor(Math.random()*fullOdsCodes.length)]
    context.vars.nhsNumber = generateValidNhsNumber()

    let prescriptionCount = Math.round(sampleNormal(3,1))
    if (prescriptionCount < 1) prescriptionCount = 1 // just truncate at 1.
    context.vars.prescriptionCount  = prescriptionCount
    
    logger.info(`Patient ${context.vars.nhsNumber}, ODS ${context.vars.odsCode} has ${context.vars.prescriptionCount} prescriptions`)
    
    done()
}

export function generatePrescData(requestParams, context, ee, next) {
  logger.info(`Generating a prescription for patient ${context.vars.nhsNumber}`)
  const body = getBody(
    true,                   /* isValid */   
    "ready to collect",     /* status */    
    context.vars.odsCode,   /* odsCode */   
    context.vars.nhsNumber  /* nhsNumber */ 
  )
  
  requestParams.json = body
  context.vars.x_request_id = uuidv4()
  context.vars.x_correlation_id = uuidv4()

  // Wait this long between requests
  let delay = sampleNormal(150, 60)
  if (delay < 0) delay = 0
  context.vars.nextDelay = delay
  logger.info(`Patient ${context.vars.nhsNumber} will think for ${context.vars.nextDelay} seconds`)
  
  next()
}

