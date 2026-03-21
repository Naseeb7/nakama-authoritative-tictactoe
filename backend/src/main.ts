function createMatchRpc(
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  _payload: string
): string {
  logger.info("create_match RPC placeholder invoked.");
  return JSON.stringify({ message: "create_match RPC not implemented yet." });
}

function findMatchRpc(
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  _payload: string
): string {
  logger.info("find_match RPC placeholder invoked.");
  return JSON.stringify({ message: "find_match RPC not implemented yet." });
}

function InitModule(
  _ctx: RpcContext,
  logger: Logger,
  _nk: Nakama,
  initializer: Initializer
): void {
  logger.info("Initializing Nakama runtime module wiring.");

  initializer.registerMatch("tic_tac_toe_match", createMatchHandler);
  initializer.registerRpc("create_match", createMatchRpc);
  initializer.registerRpc("find_match", findMatchRpc);

  logger.info("Nakama runtime module wiring complete.");
}
