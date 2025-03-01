const fs = require('fs');
const path = require('path');


// Helper function to get current date-based filename
function getLogFileName(isError) {
  const date = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const baseFile = isError ? 'error-access' : 'access';
  return path.join(__dirname, `${baseFile}-${date}.log`);
}

const getToolPayload = (toolCalls,assistant)=>{
    const hasToolPayload = toolCalls?.length
    if(!hasToolPayload) return null

    if(assistant?.hipa_enabled){
        return null
    }

   return toolCalls[0]?.function?.arguments
}
// Enhanced logging function with separators
function logToFile(message, isError) {
  const timestamp = new Date();
  const formattedDate = timestamp.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const logFile = getLogFileName(isError);
  
  const separator = '-'.repeat(50);
  const logEntry = `\n${separator}\n[${formattedDate}] START\n${message}\n[${formattedDate}] END\n${separator}\n`;
  
  fs.appendFile(logFile, logEntry, (err) => {
    if (err) console.error('Failed to write log:', err);
  });
}

// Securely stored API key
const validApiKey = process.env.VAPI_SECRET_KEY || "The value you set in the Server URL Secret Token";
const secretHeaderName = process.env.VAPI_SECRET_HEADER_NAME || "x-vapi-secret"
const availableOrganizationIds = process.env.VAPI_AVAILABLE_ORGANIZATION_IDS || ["2c542789-0000-1111-2222-5badcb932327"]

// Middleware to validate API key and log requests
export function vapiApiKeyMiddleware(req, res, next) {
    const apiKey = req.get(secretHeaderName);
    const body = req.body?.message || {}
    // VAPI INFORMATION
    const {call,timestamp,type,tool_calls, assistant } = body
    const toolCalls = tool_calls || []
    
    // HTTP REQUEST INFORMATION
    const host = req.headers.host || 'unknown host';
    const origin = req.headers.origin || 'unknown origin';
    const ip = req.ip || req.connection.remoteAddress || 'unknown ip';
    const userAgent = req.headers['user-agent'] || 'unknown user-agent';
    const method = req.method;
    const referer = req.headers.referer || 'no referer';
    
    const requestInfo = {
        request:{
            endpoint: req.originalUrl,
            host,
            origin,
            ip,
            method,
            userAgent,
            referer,
            internaltimestamp: new Date().toISOString(),
            timestamp,
            body,
        },
        response:{
            apiKey,
            validApiKey,
        },
        vapiInfo:{
            callId:call?.id,
            toolCallId:toolCalls.length ? call?.toolCalls[0]?.id : null,
            payload: getToolPayload(toolCalls,assistant),
            assistantId:assistant?.id,
            assistantName:assistant?.name,
            organizationId:assistant?.organization_id,
            assistantHipaEnabled:assistant?.hipa_enabled,
            compliancePlan:assistant?.compliance_plan,
        }
    };
    

    // VALIDATIONS
    if (!apiKey) {
        logToFile(`Unauthorized request - Missing API key: ${JSON.stringify(requestInfo)}`, true);
        return res.status(401).json({ error: 'API key is missing' });
    }
    
    if (apiKey !== validApiKey) {
        logToFile(`Invalid API key request - Invalid API key: ${JSON.stringify(requestInfo)}`, true);
        return res.status(403).json({ error: 'Invalid API key' });
    }

    if(!availableOrganizationIds.includes(assistant?.organization_id)){
        logToFile(`Invalid request - Invalid organization ID ${assistant?.organization_id} : ${JSON.stringify(requestInfo)}`, true);
        return res.status(403).json({ error: 'error - invalid organization ID [only show this error in development]'});
    }

    // check if request has been done before 10 minutes(average call length) since the call started 
    if (new Date(call?.created_at) < new Date(Date.now() - 1000 * 60 * 10)) {
        logToFile(`call expired - must be within last 10 minutes: ${JSON.stringify(requestInfo)}`, true);
        return res.status(403).json({ error: 'error - call expired - must be within last 10 minutes [only show this errorin development]'});
    }

    if(type !== "tool-calls"){
        logToFile(`Invalid request - Invalid request type [not tool-calls]: ${JSON.stringify(requestInfo)}`, true);
        return res.status(403).json({ error: 'error - invalid request type  [only show this error in development]'});
    }
    
    
    // Log successful authorized requests
    logToFile(`Authorized request: ${JSON.stringify(requestInfo)}`);
    next();
}
