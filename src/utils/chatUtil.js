import { Manager } from "@twilio/flex-ui";

import {
  PLUGIN_NAME,
  MSG_COUNT_PROP,
  AGENT_MSG_COUNT_PROP,
  CUSTOMER_MSG_COUNT_PROP,
  AVERAGE_RESPONSE_TIME,
  FIRST_RESPONSE_TIME,
} from "./constants";

let _manager = Manager.getInstance();

export const getMessageCounts = (channelSid) => {
  let agentMsgCount = 0;
  const flexState = _manager.store.getState().flex;
  const flexChatChannels = flexState.chat.channels;
  console.log(PLUGIN_NAME, "Channels from Flex Redux", flexChatChannels);

  const chatChannel = flexChatChannels[channelSid];
  const messages = chatChannel?.messages || [];
  console.log(PLUGIN_NAME, "Channel Messages", messages);

  let durations = [];
  let firstResponseTime = 0;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].isFromMe === true) {
      if (firstResponseTime == 0) {
        firstResponseTime =
          (messages[i]?.source.state.timestamp -
            messages[0]?.source.state.timestamp) /
          1000;
      }
      agentMsgCount++;
    }
    if (i > 0) {
      if (messages[i].isFromMe === true && messages[i - 1].isFromMe !== true) {
        durations.push(
          (new Date(messages[i]?.source.state.timestamp) -
            new Date(messages[i - 1]?.source.state.timestamp)) /
            1000
        );
      }
    }
  }
  // exclude first agent response
  durations.shift();
  const averageResponseTime =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;

  let msgCounts = {};
  let totalMsgCount = messages.length;
  msgCounts[MSG_COUNT_PROP] = totalMsgCount;
  msgCounts[AGENT_MSG_COUNT_PROP] = agentMsgCount;
  msgCounts[CUSTOMER_MSG_COUNT_PROP] = totalMsgCount - agentMsgCount;
  msgCounts[FIRST_RESPONSE_TIME] = firstResponseTime;
  msgCounts[AVERAGE_RESPONSE_TIME] = averageResponseTime;
  console.log(PLUGIN_NAME, "Updating msg counts", msgCounts);
  return msgCounts;
};
