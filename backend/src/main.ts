import { createTicTacToeMatchHandler } from "./modules/match_handler";

function registerRpc(logger: nkruntime.Logger, initializer: nkruntime.Initializer): void {
  initializer.registerRpc("healthcheck", (_ctx, _logger, _nk, _payload) => {
    logger.debug("Healthcheck RPC invoked.");
    return JSON.stringify({ ok: true, service: "nakama-authoritative-tictactoe" });
  });
}

function registerMatches(logger: nkruntime.Logger, initializer: nkruntime.Initializer): void {
  initializer.registerMatch("tic_tac_toe", createTicTacToeMatchHandler(logger));
}

const InitModule: nkruntime.InitModule = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
): void {
  logger.info("Initializing Nakama TypeScript runtime modules", {
    env: ctx.env,
    execution_mode: ctx.executionMode
  });

  registerRpc(logger, initializer);
  registerMatches(logger, initializer);

  logger.info("Runtime module initialization complete.");
};

export { InitModule };
