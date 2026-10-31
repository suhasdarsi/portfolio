import { walletResponse, type WalletEnv } from './wallet';
import { toolshedRequestResponse, type ToolshedEnv } from './toolshed';
export default {
  fetch(request: Request, env: WalletEnv & ToolshedEnv): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/wallet') return walletResponse(request, env);
    if (pathname === '/api/toolshed/request') return toolshedRequestResponse(request, env);
    return env.ASSETS.fetch(request);
  },
};
