import { PLUGIN_NAME, HOLD_COUNT_PROP } from "./constants";

// Adds these task.attributes
// conversations":{"followed_by":"Transfer to Queue","destination":"<queue name>"} or
// conversations":{"followed_by":"Transfer to Agent"}
export const updateConversations = async (task, conversationsData = {}) => {
  let newAttributes = { ...task.attributes };
  let conversations = task.attributes.conversations;
  let newConv = {};
  if (conversations) {
    newConv = { ...conversations };
  }
  let convAttributes = Object.keys(conversationsData);
  if (convAttributes.length > 0) {
    for (const attr of convAttributes) {
      newConv[attr] = conversationsData[attr];
    }
    newAttributes.conversations = newConv;
    console.log(
      PLUGIN_NAME,
      "Updating task with new attributes:",
      newAttributes
    );
    await task.setAttributes(newAttributes);
  }
};

export const resetConversations = async (task) => {
  //Transfers and Hold Count - only remove if there was a transfer
  console.log(PLUGIN_NAME, "Reset conversations task:", task);
  let newAttributes = { ...task.attributes };
  console.log(PLUGIN_NAME, "New task attr:", newAttributes);
  if (newAttributes?.conversations?.followed_by) {
    delete newAttributes.conversations.followed_by;
    delete newAttributes.conversations.destination;
    delete newAttributes.conversations[HOLD_COUNT_PROP];
    console.log(PLUGIN_NAME, "Reset task attributes:", newAttributes);
    await task.setAttributes(newAttributes);
  }
};
