import { Actions, VERSION, Manager, TaskHelper } from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin'
//import reducers, { namespace } from './states';

const PLUGIN_NAME = 'CustomInsightsDataPlugin';
const HOLD_COUNT_PROP = 'conversation_measure_1';
const MSG_COUNT_PROP = 'conversation_measure_2';
const AGENT_MSG_COUNT_PROP = 'conversation_measure_3';
const CUSTOMER_MSG_COUNT_PROP = 'conversation_measure_4';
const CALL_SID_LABEL_PROP = 'conversation_label_9';
const CONFERENCE_SID_LABEL_PROP = 'conversation_label_10';

const CUSTOMER = 'Customer';
const AGENT = 'Agent';
const UNKNOWN = 'Unknown';

//Global var to store queues object
let queues = undefined;
let _manager = Manager.getInstance();

export default class CustomInsightsDataPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  // Add these task.attributes
  // conversations":{"followed_by":"Transfer to Queue","destination":"<queue name>"} or
  // conversations":{"followed_by":"Transfer to Agent"}
  updateConversations = async (task, conversationsData = {}) => {
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
      console.log(PLUGIN_NAME, 'Updating task with new attributes:', newAttributes);
      await task.setAttributes(newAttributes);
    }
  }

  resetConversations = async (task) => {
    let newAttributes = { ...task.attributes };
    //Remove conversations property from object
    if (newAttributes.hasOwnProperty('conversations')) {
      console.log(PLUGIN_NAME, 'Removing custom conversations attributes');
      delete newAttributes.conversations.followed_by;
      delete newAttributes.conversations.destination;
      delete newAttributes.conversations[HOLD_COUNT_PROP];
    }
    console.log(PLUGIN_NAME, 'Reset task attributes:', newAttributes);
    await task.setAttributes(newAttributes);
  }

  setCallConfSids = async (task) => {
    //Store Customer Call Sid and Conference Sid in conversation_label_9 + 10
    console.log(PLUGIN_NAME, 'setCallConfSids: ', task);
    let callSid = task.attributes?.conference?.participants?.customer;
    let confSid = task.attributes?.conference?.sid;
    if (callSid && confSid) {
      let newConvData = {};
      newConvData[CALL_SID_LABEL_PROP] = callSid
      newConvData[CONFERENCE_SID_LABEL_PROP] = confSid
      await this.updateConversations(task, newConvData);
    }
  }

  getQueues = (manager) => new Promise(async (resolve) => {
    if (!queues) {
      const query = await manager.insightsClient.instantQuery('tr-queue');
      query.on('searchResult', (items) => {
        console.log(PLUGIN_NAME, 'Storing queues once', items);
        queues = items;
        resolve(items);
      });
      query.search('');
    } else {
      resolve(queues);
    }
  });


  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  async init(flex, manager) {
    this.registerReducers(manager);

    Actions.addListener('beforeTransferTask', async (payload) => {
      console.log(PLUGIN_NAME, 'beforeTransferTaskPayload: ', payload);
      const targetSid = payload.targetSid;
      let followed_by, destination;
      if (targetSid.startsWith('WQ')) {
        followed_by = "Transfer to Queue";
        const queues = await this.getQueues(manager);
        console.log(PLUGIN_NAME, 'queues retrieved:', queues);
        //queues is map/object with queue objects {queue_name: , queue_sid: }
        let targetQueue = Object.values(queues).find(queue => queue.queue_sid === targetSid);
        console.log(PLUGIN_NAME, 'targetQueueName: ', targetQueue.queue_name);
        destination = targetQueue.queue_name;

      } else {
        followed_by = "Transfer to Agent";
      }
      await this.updateConversations(payload.task, { followed_by, destination });
    });

    //Optional: Auto Complete Task/Res for original agent initiating transfer
    Actions.addListener('afterTransferTask', async (payload) => {
      console.log(PLUGIN_NAME, 'afterTransferTaskPayload: ', payload);
      let hang_up_by = UNKNOWN;
      await this.updateConversations(payload.task, { hang_up_by });
      //   Actions.invokeAction('CompleteTask', { sid: payload.sid });
    });

    Actions.addListener("afterHangupCall", async (payload) => {
      console.log(PLUGIN_NAME, 'afterHangupCallPayload: ', payload);
      let hang_up_by = AGENT;
      await this.updateConversations(payload.task, { hang_up_by });
    });


    //Need to clear custom conversations attributes before next segment
    Actions.addListener('afterCompleteTask', async (payload) => {
      await this.resetConversations(payload.task);
    });


    Actions.addListener('afterHoldCall', async (payload) => {
      //Increase hold count
      let holdCount = 0;
      const attr = payload.task.attributes;
      if (attr.hasOwnProperty('conversations')) {
        holdCount = attr.conversations[HOLD_COUNT_PROP] ? parseInt(attr.conversations[HOLD_COUNT_PROP]) : 0;
      }
      let newConvData = {};
      newConvData[HOLD_COUNT_PROP] = holdCount + 1;
      console.log(PLUGIN_NAME, 'Updating hold count', newConvData);
      await this.updateConversations(payload.task, newConvData);
    });


    manager.workerClient.on("reservationCreated", async reservation => {
      if (reservation.task.taskChannelUniqueName == 'voice') {
        reservation.on("wrapup", async (reservation) => {
          console.log(PLUGIN_NAME, 'Reservation wrapup', reservation);
          await this.setCallConfSids(reservation.task);
        });
        //Set default value
        this.updateConversations(reservation.task, { hang_up_by: CUSTOMER });

      } else {

        reservation.on('accepted', async (reservation) => {
          console.log(PLUGIN_NAME, 'Reservation Accepted: ', reservation);

          // https://media.twiliocdn.com/sdk/js/chat/releases/3.2.4/docs/Client.html#event:channelAdded
          // Fired when a Channel becomes visible to the Client. 
          // Fired for created and not joined private channels and for all type of channels Client has joined or invited to.
          manager.chatClient.on("channelAdded", async (channel) => {

            console.log(PLUGIN_NAME, 'Channel Added.');
            //Chat metrics - First Response time (duration) from Agent's first reply to customer
            let channelSid = reservation.task.attributes.channelSid;
            //let workerName = manager.workerClient.name;  //name has @ etc
            const identity = manager.workerClient.attributes.contact_uri.replace('client:', '');
            channel.on('messageAdded', async (message) => {
              const { author, body } = message;

              let workerResponseTime;
              console.log(PLUGIN_NAME, 'Channel', channelSid, 'created', channel.dateCreated, 'Message from', author, 'at', message.timestamp);
              const attr = reservation.task.attributes;

              //Agent First Response Time
              if (author == identity) {
                workerResponseTime = (message.timestamp - channel.dateCreated) / 1000;
                let firstResponseTime = 0;
                if (attr.hasOwnProperty('conversations')) {
                  firstResponseTime = attr.conversations.first_response_time ? attr.conversations.first_response_time : 0;
                }
                //Only reset 1st time
                if (firstResponseTime == 0) {
                  let newConvData = {};
                  newConvData.first_response_time = workerResponseTime;
                  console.log(PLUGIN_NAME, 'Updating first response time', newConvData);
                  await this.updateConversations(reservation.task, newConvData);
                }
              };

            });
            channel.on('memberLeft', async (member) => {
              console.log(PLUGIN_NAME, member.identity, 'left the chat');
              if (member.identity == identity) {
                await this.updateConversations(reservation.task, { hang_up_by: AGENT });
              } else {
                await this.updateConversations(reservation.task, { hang_up_by: CUSTOMER });
              }
            });

          });
        });

        reservation.on('wrapup', async (reservation) => {
          console.log(PLUGIN_NAME, 'Reservation WrapUp: ', reservation);
          let channelSid = reservation.task.attributes.channelSid;
          let agentMsgCount = 0;
          const flexState = _manager.store.getState().flex;
          const flexChatChannels = flexState.chat.channels;
          console.log(PLUGIN_NAME, 'Channels from Flex Redux', flexChatChannels);

          const chatChannel = flexChatChannels[channelSid];
          const messages = chatChannel?.messages || [];
          console.log(PLUGIN_NAME, 'Channel Messages', messages);
          messages.forEach(m => {
            if (m.isFromMe == true) agentMsgCount++;
          });

          let msgCounts = {};
          let totalMsgCount = messages.length;
          msgCounts[MSG_COUNT_PROP] = totalMsgCount;
          msgCounts[AGENT_MSG_COUNT_PROP] = agentMsgCount;
          msgCounts[CUSTOMER_MSG_COUNT_PROP] = totalMsgCount - agentMsgCount;
          console.log(PLUGIN_NAME, 'Updating msg counts', msgCounts);
          await this.updateConversations(reservation.task, msgCounts);
        });
      }
    });
  }
  /**
   * Registers the plugin reducers
   *
   * @param manager { Flex.Manager }
   */
  registerReducers(manager) {
    if (!manager.store.addReducer) {
      // eslint-disable-next-line
      console.error(`You need FlexUI > 1.9.0 to use built-in redux; you are currently on ${VERSION}`);
      return;
    }

    //manager.store.addReducer(namespace, reducers);
  }
}
