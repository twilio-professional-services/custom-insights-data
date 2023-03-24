import { PLUGIN_NAME } from "./constants";

let queues = undefined;

export const getQueues = (manager) =>
  new Promise(async (resolve) => {
    if (!queues) {
      const query = await manager.insightsClient.instantQuery("tr-queue");
      query.on("searchResult", (items) => {
        console.log(PLUGIN_NAME, "Storing queues once", items);
        queues = items;
        resolve(items);
      });
      query.search("");
    } else {
      resolve(queues);
    }
  });

export const getQueueElements = (queue) => {
  let queueElem = undefined;
  const queueNameComponents = queue.split(".");
  // Assumption: if the queue name contains two '.', the format is "lob.product.channel"
  if (queueNameComponents && queueNameComponents.length == 3) {
    queueElem = {
      lob: queueNameComponents[0],
      product: queueNameComponents[1],
    };
  }
  return queueElem;
};
