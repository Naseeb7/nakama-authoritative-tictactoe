function updatePlayerStats(nk: Nakama, userId: string, didWin: boolean): void {
  var stats = readPlayerStats(nk, userId);

  stats.gamesPlayed += 1;

  if (didWin) {
    stats.wins += 1;
    stats.currentStreak += 1;

    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
  } else {
    stats.losses += 1;
    stats.currentStreak = 0;
  }

  writePlayerStats(nk, userId, stats);
}

function resetPlayerStreak(nk: Nakama, userId: string): void {
  var stats = readPlayerStats(nk, userId);

  stats.currentStreak = 0;

  writePlayerStats(nk, userId, stats);
}

function updateDrawStats(nk: Nakama, userId: string): void {
  var stats = readPlayerStats(nk, userId);

  stats.gamesPlayed += 1;
  stats.currentStreak = 0;

  writePlayerStats(nk, userId, stats);
}

function readPlayerStats(nk: Nakama, userId: string): PlayerStats {
  var objects = nk.storageRead([
    {
      collection: PLAYER_STATS_COLLECTION,
      key: PLAYER_STATS_KEY,
      userId: userId
    }
  ]);

  if (!objects || objects.length === 0) {
    return createDefaultPlayerStats();
  }

  return normalizePlayerStats(objects[0].value);
}

function writePlayerStats(nk: Nakama, userId: string, stats: PlayerStats): void {
  nk.storageWrite([
    {
      collection: PLAYER_STATS_COLLECTION,
      key: PLAYER_STATS_KEY,
      userId: userId,
      value: stats as any,
      permissionRead: 1,
      permissionWrite: 0
    }
  ]);
}

function createDefaultPlayerStats(): PlayerStats {
  return {
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    currentStreak: 0,
    bestStreak: 0
  };
}

function normalizePlayerStats(rawValue: any): PlayerStats {
  var parsed = typeof rawValue === "string" ? parseStatsValue(rawValue) : rawValue;
  var base = createDefaultPlayerStats();

  if (!parsed) {
    return base;
  }

  return {
    wins: toSafeNumber(parsed.wins),
    losses: toSafeNumber(parsed.losses),
    gamesPlayed: toSafeNumber(parsed.gamesPlayed),
    currentStreak: toSafeNumber(parsed.currentStreak),
    bestStreak: toSafeNumber(parsed.bestStreak)
  };
}

function parseStatsValue(rawValue: string): any {
  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    return null;
  }
}

function toSafeNumber(value: any): number {
  if (typeof value === "number" && value >= 0) {
    return value;
  }

  return 0;
}
