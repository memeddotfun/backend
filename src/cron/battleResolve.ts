import { memedBattleResolver_contract } from "../config/factory";
import * as cron from "node-cron";

export const startBattleResolveCron = () => {
  // Schedule: '* * * * *' = Every minute
  const job = cron.schedule('* * * * *', async () => {
    console.log('🔥 Starting daily battle resolve cron job at', new Date().toISOString());
    const battleIdsToResolve = await memedBattleResolver_contract.getBattleIdsToResolve();
    for (const battleId of battleIdsToResolve) {
      await memedBattleResolver_contract.resolveBattle(battleId);
    }
  }, {
    timezone: 'UTC'
  });

  return job;
};