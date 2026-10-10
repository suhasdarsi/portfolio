import { walletResponse, type WalletEnv } from './wallet';
export default {
  fetch(request: Request, env: WalletEnv): Promise<Response> {
    if (new URL(request.url).pathname === '/api/wallet') return walletResponse(request, env);
    return env.ASSETS.fetch(request);
  },
};
