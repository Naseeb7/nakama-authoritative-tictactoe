var MATCH_LIST_LIMIT = 1000;

function getRequestedMatchMode(payload: string): MatchMode {
  var parsed = parseMatchmakingPayload(payload);

  if (parsed && parsed.mode === "timed") {
    return "timed";
  }

  if (parsed && parsed.timed === true) {
    return "timed";
  }

  return "classic";
}

function getMatchLabelPrefixForMode(mode: MatchMode): string {
  return MATCH_LABEL_PREFIX + ":" + mode;
}

function parseMatchmakingPayload(payload: string): any {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch (_error) {
    return null;
  }
}

function hasCompatibleMatchLabel(label: string | undefined, mode: MatchMode): boolean {
  if (!label) {
    return false;
  }

  if (label.indexOf(getMatchLabelPrefixForMode(mode)) === 0) {
    return true;
  }

  if (mode === "classic" && label === MATCH_LABEL_PREFIX) {
    return true;
  }

  if (mode === "timed" && label === MATCH_LABEL_PREFIX + "_timed") {
    return true;
  }

  return false;
}

function isWaitingMatchLabel(label: string | undefined, labelPrefix: string): boolean {
  if (!label) {
    return false;
  }

  if (label.indexOf(labelPrefix + ":waiting") === 0) {
    return true;
  }

  return label === MATCH_LABEL_PREFIX || label === MATCH_LABEL_PREFIX + "_timed";
}
