import { Actions, TaskHelper } from "@twilio/flex-ui";
import { updateConversations, resetConversations } from "../utils/taskUtil";
import { getQueues, getQueueElements } from "../utils/queueUtil";
import { getMessageCounts } from "../utils/chatUtil";
import {
  PLUGIN_NAME,
  HOLD_COUNT_PROP,
  AGENT,
  UNKNOWN,
  LOB_PROP,
  PRODUCT_PROP
} from "../utils/constants";

export default (manager) => {
  Actions.addListener("beforeTransferTask", async (payload) => {
    console.log(PLUGIN_NAME, "beforeTransferTaskPayload: ", payload);
    const targetSid = payload.targetSid;
    let followed_by, destination;
    if (targetSid.startsWith("WQ")) {
      followed_by = "Transfer to Queue";
      const queues = await getQueues(manager);
      console.log(PLUGIN_NAME, "queues retrieved:", queues);
      //queues is map/object with queue objects {queue_name: , queue_sid: }
      let targetQueue = Object.values(queues).find(
        (queue) => queue.queue_sid === targetSid
      );
      console.log(PLUGIN_NAME, "targetQueueName: ", targetQueue.queue_name);
      destination = targetQueue.queue_name;
    } else {
      followed_by = "Transfer to Agent";
    }
    let convoData = { hang_up_by: UNKNOWN, followed_by, destination };

    const task = TaskHelper.getTaskByTaskSid(payload.sid);
    if (task.taskChannelUniqueName !== "voice") {
      //Chat only
      const msgCounts = getMessageCounts(task.attributes.conversationSid);
      convoData = { ...convoData, ...msgCounts };
      const queueElem = getQueueElements(payload.task.queueName);
      if (queueElem) {
        convoData[LOB_PROP] = queueElem.lob;
        convoData[PRODUCT_PROP] = queueElem.product;
      }
    }
    await updateConversations(payload.task, convoData);
  });

  Actions.addListener("afterHangupCall", async (payload) => {
    console.log(PLUGIN_NAME, "afterHangupCallPayload: ", payload);
    let convoData = { hang_up_by: AGENT };
    const queueElem = getQueueElements(payload.task.queueName);
    if (queueElem) {
      convoData[LOB_PROP] = queueElem.lob;
      convoData[PRODUCT_PROP] = queueElem.product;
    }
    await updateConversations(payload.task, convoData);
  });

  //Need to clear custom conversations attributes before next segment
  Actions.addListener("afterCompleteTask", async (payload) => {
    console.log(PLUGIN_NAME, "afterCompleteTask: ", payload);
    await resetConversations(payload.task);
  });

  //Disable this if you you have no need to capture hold count
  Actions.addListener("afterHoldCall", async (payload) => {
    //Increase hold count
    let holdCount = 0;
    const attr = payload.task.attributes;
    if (attr.hasOwnProperty("conversations")) {
      holdCount = attr.conversations[HOLD_COUNT_PROP]
        ? parseInt(attr.conversations[HOLD_COUNT_PROP])
        : 0;
    }
    let newConvData = {};
    newConvData[HOLD_COUNT_PROP] = holdCount + 1;
    console.log(PLUGIN_NAME, "Updating hold count", newConvData);
    await updateConversations(payload.task, newConvData);
  });
};
