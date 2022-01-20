import { Actions, VERSION } from '@twilio/flex-ui';
import { FlexPlugin } from 'flex-plugin';

//import reducers, { namespace } from './states';

const PLUGIN_NAME = 'CustomInsightsDataPlugin';
const HOLD_COUNT_PROP = 'conversation_measure_1';

//Global var to store queues object
let queues = undefined;

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
    
    //Need to clear custom conversations attributes before next segment
    Actions.addListener('afterCompleteTask', async (payload) => {
      await this.resetConversations(payload.task);
    });


    Actions.addListener('afterHoldCall', async (payload) => {
      //Increase hold count
      let holdCount = 0;
      const attr = payload.task.attributes;
      let holdCountProp = 'conversation_measure_1';
      if (attr.hasOwnProperty('conversations')) {
        holdCount = attr.conversations[HOLD_COUNT_PROP] ? parseInt(attr.conversations[HOLD_COUNT_PROP]) : 0;
      }
      let newConvData = {};
      newConvData[HOLD_COUNT_PROP] = holdCount + 1;
      console.log(PLUGIN_NAME, 'Updating hold count', newConvData);
      await this.updateConversations(payload.task, newConvData);
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
