import {v4 as uuidv4}   from "uuid"
import pino from "pino"
import {getSharedAuthToken, getBody} from "./helper/psu.mjs"
import {allowedOdsCodes, blockedOdsCodes} from "./helper/odscodes.mjs"

export { getSharedAuthToken }

const logger = pino()

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

function initUserContextVars(context) {
  context.vars.nhsNumber = generateValidNhsNumber()

  let prescriptionCount = Math.round(sampleNormal(3,1))
  if (prescriptionCount < 1) prescriptionCount = 1 // just truncate at 1.
  context.vars.prescriptionCount  = prescriptionCount
  context.vars.loopcount = 0
}

export function initUserAllowed(context, events, done) {
  logger.info("Initializing user context variables for allowed ODS codes")
  initUserContextVars(context)
  
  // Generate data for a patient with an allowed ODS code
  context.vars.odsCode = allowedOdsCodes[Math.floor(Math.random() * allowedOdsCodes.length)]

  logger.info(`[ALLOWED] Patient ${context.vars.nhsNumber}, ODS ${context.vars.odsCode} has ${context.vars.prescriptionCount} prescriptions`)
  done()
}

export function initUserBlocked(context, events, done) {
  logger.info("Initializing user context variables for allowed ODS codes")
  initUserContextVars(context)

  // Generate data for a patient with a blocked ODS code
  context.vars.odsCode = blockedOdsCodes[Math.floor(Math.random() * blockedOdsCodes.length)]

  logger.info(`[BLOCKED] Patient ${context.vars.nhsNumber}, ODS ${context.vars.odsCode} has ${context.vars.prescriptionCount} prescriptions`)
  done()
}

export function generatePrescData(requestParams, context, ee, next) {
  const isAllowed = allowedOdsCodes.includes(context.vars.odsCode);
  const logPrefix = isAllowed ? "[ALLOWED]" : "[BLOCKED]";

  logger.debug(`${logPrefix} Generating a prescription for patient ${context.vars.nhsNumber}`)
  const body = getBody(
    true,                   /* isValid */   
    "completed",            /* status */    
    context.vars.odsCode,   /* odsCode */   
    context.vars.nhsNumber, /* nhsNumber */ 
    "ready to collect"      /* Item status */
  )
  // The body is fine - it works when I put it in postman

  requestParams.json = body
  context.vars.x_request_id = uuidv4()
  context.vars.x_correlation_id = uuidv4()

  context.vars.loopcount += 1

  // Wait this long between requests
  let meanDelay = 10 // seconds
  let stdDevDelay = 10 // seconds
  let delay = 0
  if (context.vars.loopcount < context.vars.prescriptionCount) {
    delay = sampleNormal(meanDelay, stdDevDelay)
    while (delay < 0) delay = sampleNormal(meanDelay, stdDevDelay)
  }

  context.vars.nextDelay = delay
  logger.debug(`${logPrefix} Patient ${context.vars.nhsNumber} (on prescription update ${context.vars.loopcount}/${context.vars.prescriptionCount}) will think for ${context.vars.nextDelay} seconds`)
  next()
}
