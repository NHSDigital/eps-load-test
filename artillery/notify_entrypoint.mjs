import {v4 as uuidv4}   from "uuid"
import pino from "pino"
import {getSharedAuthToken, getBody} from "./psu_entrypoint.mjs"
import {allowedOdsCodes} from "./allowed_odsCodes.js"

const logger = pino()

const NUM_ODS_CODES = 10000

// make a list of 10k ODS codes, using the known-valid ones as a seed
const fullOdsCodes = (() => {
    const set = new Set(allowedOdsCodes)
    const codes = [...allowedOdsCodes]
    
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const numbers = "0123456789"
    
    while (codes.length < NUM_ODS_CODES) {
        let c = ""
        for (let i = 0; i < 2; i++) {
            c += letters.charAt(Math.floor(Math.random() * letters.length))
        }
        for (let i = 0; i < 3; i++) {
            c += numbers.charAt(Math.floor(Math.random() * numbers.length))
        }
        
        if (!set.has(c)) {
            set.add(c)
            codes.push(c)
        }
    }
    
    return codes
})()

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
