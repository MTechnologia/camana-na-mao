/**
 * Centralized utility to remove internal technical markers from message content.
 * Handles nested brackets in JSON payloads correctly (e.g., arrays like ["flooding"]).
 */

/**
 * Removes markers with balanced braces, handling nested brackets.
 * Example: [COLLECTION_PROGRESS:type:{"arr":["a","b"]}] → removed entirely
 */
function removeBalancedMarker(text: string, markerStart: string): string {
  let result = '';
  let i = 0;
  
  while (i < text.length) {
    const markerIndex = text.indexOf(markerStart, i);
    
    if (markerIndex === -1) {
      result += text.slice(i);
      break;
    }
    
    result += text.slice(i, markerIndex);
    
    // Find the opening brace after marker type
    const braceStart = text.indexOf('{', markerIndex);
    if (braceStart === -1) {
      // No JSON payload, just skip marker start and continue
      i = markerIndex + markerStart.length;
      continue;
    }
    
    // Find matching closing brace using depth counting
    let depth = 0;
    let braceEnd = braceStart;
    
    for (let j = braceStart; j < text.length; j++) {
      if (text[j] === '{') depth++;
      if (text[j] === '}') depth--;
      
      if (depth === 0) {
        braceEnd = j;
        break;
      }
    }
    
    // Skip to after the closing ]
    const closingBracket = text.indexOf(']', braceEnd);
    i = closingBracket !== -1 ? closingBracket + 1 : braceEnd + 1;
  }
  
  return result;
}

/**
 * Remove all internal technical markers from message content.
 * Handles nested brackets in JSON payloads correctly.
 */
export const sanitizeMessageContent = (content: string): string => {
  if (!content) return '';
  
  let result = content;
  
  // Remove COLLECTION_PROGRESS with nested JSON (handles arrays like ["flooding"])
  result = removeBalancedMarker(result, '[COLLECTION_PROGRESS:');
  
  // Remove other markers with simple patterns
  result = result
    .replace(/\[REPORT_CREATED:[a-f0-9-]+\]/g, '')
    .replace(/\[TRANSPORT_CREATED:[a-f0-9-]+\]/g, '')
    .replace(/\[RATING_CREATED:[a-f0-9-]+\]/g, '')
    .replace(/\[FIELD_REQUEST:\w+\]/g, '')
    .replace(/\[ADDRESS_PICKER\]/g, '')
    .replace(/\[LINE_PICKER\]/g, '')
    .replace(/\[DATE_PICKER\]/g, '')
    .replace(/\[TIME_PICKER\]/g, '')
    .replace(/\[RATING_PICKER\]/g, '')
    .replace(/\[\s*LOCATION_METHOD_PICKER\s*\]/g, '')
    .replace(/\[SERVICE_TYPE_PICKER\]/g, '')
    .replace(/\[SERVICE_PICKER\]/g, '')
    .replace(/\[SERVICE_ADDRESS_CONFIRM:[^\]]+\]/g, '')
    .replace(/\[JOURNEY_SWITCH_PROMPT:\w+:\w+\]/g, '')
    .replace(/\[JOURNEY_SWITCHED:\w+\]/g, '')
    .replace(/\[JOURNEY_DECLINED:\w+\]/g, '')
    .replace(/\[LIGHT_JOURNEY:\w+\]/g, '')
    .trim();
  
  return result;
};

/**
 * Clean internal markers from preview text (for conversation cards)
 */
export const cleanInternalMarkers = (text: string): string => {
  if (!text) return "";
  return sanitizeMessageContent(text).replace(/\*\*/g, "");
};
