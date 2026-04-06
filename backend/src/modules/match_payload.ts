function parseMovePayload(data: any): MovePayload | null {
  var normalizedPayload = normalizePayloadString(data);
  var decodedPayload: string | null;

  if (normalizedPayload === null) {
    return null;
  }

  try {
    return JSON.parse(normalizedPayload) as MovePayload;
  } catch (_error) {
    decodedPayload = decodeBase64Payload(normalizedPayload);

    if (decodedPayload === null) {
      return null;
    }

    try {
      return JSON.parse(decodedPayload) as MovePayload;
    } catch (_decodeError) {
      return null;
    }
  }
}

function normalizePayloadString(data: any): string | null {
  var i: number;
  var value: number;
  var output = "";
  var byteView: Uint8Array | null = null;

  if (typeof data === "string") {
    return data;
  }

  if (data === null || data === undefined) {
    return null;
  }

  if (typeof ArrayBuffer !== "undefined") {
    if (data instanceof ArrayBuffer) {
      byteView = new Uint8Array(data);
    } else if (
      typeof ArrayBuffer.isView === "function" &&
      ArrayBuffer.isView(data) &&
      data.buffer instanceof ArrayBuffer
    ) {
      byteView = new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength || 0);
    }
  }

  if (byteView !== null) {
    for (i = 0; i < byteView.length; i += 1) {
      output += String.fromCharCode(byteView[i]);
    }

    return output;
  }

  if (typeof data.length === "number") {
    for (i = 0; i < data.length; i += 1) {
      value = data[i];

      if (typeof value !== "number") {
        return null;
      }

      output += String.fromCharCode(value);
    }

    return output;
  }

  return null;
}

function describePayloadForLog(data: any): string {
  var normalizedPayload = normalizePayloadString(data);
  var stringValue: string;

  if (normalizedPayload !== null) {
    return "normalized:" + normalizedPayload;
  }

  try {
    stringValue = String(data);
  } catch (_error) {
    stringValue = "[stringify-failed]";
  }

  return (
    "type=" +
    typeof data +
    " string=" +
    stringValue +
    " json=" +
    safeJsonStringify(data)
  );
}

function safeJsonStringify(value: any): string {
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return "[json-failed]";
  }
}

function decodeBase64Payload(data: string): string | null {
  var normalizedData = normalizePayloadString(data);
  var base64Chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var cleanData: string;
  var output = "";
  var i: number;
  var enc1: number;
  var enc2: number;
  var enc3: number;
  var enc4: number;
  var chr1: number;
  var chr2: number;
  var chr3: number;

  if (normalizedData === null) {
    return null;
  }

  cleanData = normalizedData.replace(/\s+/g, "");

  if (!cleanData || cleanData.length % 4 !== 0) {
    return null;
  }

  for (i = 0; i < cleanData.length; i += 4) {
    enc1 = base64Chars.indexOf(cleanData.charAt(i));
    enc2 = base64Chars.indexOf(cleanData.charAt(i + 1));
    enc3 = cleanData.charAt(i + 2) === "=" ? 64 : base64Chars.indexOf(cleanData.charAt(i + 2));
    enc4 = cleanData.charAt(i + 3) === "=" ? 64 : base64Chars.indexOf(cleanData.charAt(i + 3));

    if (enc1 < 0 || enc2 < 0 || (enc3 < 0 && enc3 !== 64) || (enc4 < 0 && enc4 !== 64)) {
      return null;
    }

    chr1 = (enc1 << 2) | (enc2 >> 4);
    output += String.fromCharCode(chr1);

    if (enc3 !== 64) {
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      output += String.fromCharCode(chr2);
    }

    if (enc4 !== 64) {
      chr3 = ((enc3 & 3) << 6) | enc4;
      output += String.fromCharCode(chr3);
    }
  }

  return output;
}
