import ccxt, { Balances } from "ccxt";

export class BitFlyerClient {
  private client;

  constructor(apiKey: string, apiSecret: string) {
    this.client = new ccxt.bitflyer({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
    });
  }

  // 現在の資産残高を取得
  async getBalance(): Promise<Balances> {
    return await this.client.fetchBalance();
  }

  // 取引ペアの情報を取得
  async getTicker(symbol: string) {
    return await this.client.fetchTicker(symbol);
  }

  // 成行買い注文を作成
  async createMarketBuyOrder(symbol: string, amount: number) {
    return await this.client.createMarketBuyOrder(symbol, amount);
  }

  // 成行売り注文を作成
  async createMarketSellOrder(symbol: string, amount: number) {
    return await this.client.createMarketSellOrder(symbol, amount);
  }

  // 注文一覧を取得
  async getOrders(symbol: string, since?: number, limit?: number) {
    return await this.client.fetchOrders(symbol, since, limit);
  }
}
