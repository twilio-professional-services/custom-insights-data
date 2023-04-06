import { VERSION, TaskHelper } from "@twilio/flex-ui";
import { FlexPlugin } from "@twilio/flex-plugin";

import CustomActions from "./actions";
import registerEventListeners from "./event-listeners";
import { handleReservationWrapup } from "./event-listeners";
import { PLUGIN_NAME } from "./utils/constants";

export default class CustomInsightsDataPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  async init(flex, manager) {
    this.registerReducers(manager);

    CustomActions(manager);
    registerEventListeners(manager);

    //Wait for flex to load before checking for tasks
    const flexInitWait = 1000;
    const flexInitializeInterval = setTimeout(() => {
      const reservations = manager.workerClient.reservations;
      console.log(PLUGIN_NAME, "Reservations", reservations);
      if (reservations) {
        reservations.forEach((reservation) => {
          reservation.on("wrapup", () => handleReservationWrapup(reservation));
        });
      }
      clearTimeout(flexInitializeInterval);
    }, flexInitWait);
  }

  /**
   * Registers the plugin reducers
   *
   * @param manager { Flex.Manager }
   */
  registerReducers(manager) {
    if (!manager.store.addReducer) {
      // eslint-disable-next-line
      console.error(
        `You need FlexUI > 1.9.0 to use built-in redux; you are currently on ${VERSION}`
      );
      return;
    }

    //manager.store.addReducer(namespace, reducers);
  }
}
