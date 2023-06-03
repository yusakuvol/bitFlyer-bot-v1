import * as dotenv from "dotenv";
import { config } from "../strategyConfig";
import { BitFlyerClient } from "./bitFlyerClient";

const { unit, profitLine, extraBuyLine } = config;
const orderPrices: number[] = [];
let intervalId: NodeJS.Timer;

// 初期化処理
const initialize = async () => {
  // 環境変数の設定
  dotenv.config();
  const apiKey = process.env.BITFLYER_API_KEY;
  const apiSecret = process.env.BITFLYER_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("API Key and API Secret are required");
  }

  // bitflyerクライアントの初期化
  const bitFlyerClient = new BitFlyerClient(apiKey, apiSecret);
  return { bitFlyerClient };
};

// 注文情報を格納
const calculateOrder = async (client: any) => {
  const orders = await client.getOrders("BTC/JPY");
  const lastOrderPrice = orders.slice(-1)[0].info.average_price;
  orderPrices.push(Number(lastOrderPrice));
};

// 注文情報を初期化
const resetOrder = () => {
  orderPrices.length = 0;
};

const main = async () => {
  try {
    const { bitFlyerClient } = await initialize();
    const logic = async () => {
      try {
        // 残高不足の場合はフラグを立ててorderを作成しない、利確はする
        const balance = await bitFlyerClient.getBalance();
        const JPY = Object(balance.free).JPY || 0;
        const { bid, ask } = await bitFlyerClient.getTicker("BTC/JPY");
        const isBalanceShortage = JPY < ask * unit;

        if (orderPrices.length === 0) {
          // 初回購入
          // 下げトレンドの反発狙いで買う
          const order = await bitFlyerClient.createMarketBuyOrder(
            "BTC/JPY",
            unit
          );
          console.log("初回Order:", order);
          calculateOrder(bitFlyerClient);
        } else {
          // 2回目以降の購入
          // 平均取得価格計算
          const orders = await bitFlyerClient.getOrders("BTC/JPY");
          const lastOrderPrice = orders.slice(-1)[0].info.average_price;
          orderPrices.push(Number(lastOrderPrice));
          const averagePrice =
            orderPrices.reduce((a, b) => a + b, 0) / orderPrices.length;

          // 利確ライン計算
          const profitPrice = averagePrice * profitLine;
          // 買い増しライン計算
          const extraBuyPrice = lastOrderPrice * extraBuyLine;

          if (ask > profitPrice) {
            // 利確
            const order = await bitFlyerClient.createMarketSellOrder(
              "BTC/JPY",
              unit
            );
            console.log("利確Order:", order);
            calculateOrder(bitFlyerClient);
            // 利確時にorderPricesを初期化
            resetOrder();
            throw new Error("利確");
          } else if (bid < extraBuyPrice && !isBalanceShortage) {
            // ナンピン
            const order = await bitFlyerClient.createMarketBuyOrder(
              "BTC/JPY",
              unit
            );
            console.log("ナンピンOrder:", order);
            calculateOrder(bitFlyerClient);
          } else {
            console.log("NoOrder:", {
              bid,
              ask,
              profitPrice: Math.floor(profitPrice),
              extraBuyPrice: Math.floor(extraBuyPrice),
            });
          }
        }
      } catch (error) {
        throw error;
      }
    };

    // 60秒ごとに繰り返す
    const interval = 60 * 1000;
    intervalId = setInterval(logic, interval);
  } catch (error) {
    // エラーが発生したらintervalを止める
    clearInterval(intervalId);
    console.error(error);
  }
};

main();
