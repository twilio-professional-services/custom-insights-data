# Custom Flex Insights Data Plugin v0.2 (WIP)

## Your custom Twilio Flex Plugin
Twilio Flex Plugins allow you to customize the appearance and behavior of [Twilio Flex](https://www.twilio.com/flex). If you want to learn more about the capabilities and how to use the API, check out our [Flex documentation](https://www.twilio.com/docs/flex).

## How it works
This Flex plugin captures several custom attributes for enhanced reporting capabilities in Flex Insights.


| Channel | Conversations Attribute | Description & Values |
| ------  | -------- | ----------- |
| Voice | followed_by | "Transfer to Queue" or "Transfer to Agent" (future: "External Transfer") |
| Voice | destination | Transfer Queue Name (future: Agent Name or Phone Number for External Transfer) |
| Voice | conversation_measure_1 | Hold Count per segment (reservation) |
| Voice | conversation_label_9 | Customer Call Sid |
| Voice | conversation_label_10 | Conference Sid |
| Chat | first_response_time | Agent's First Message/Response Time |
| Chat | conversation_measure_2 | Total Message Count in the Chat Channel |

Note: This is the first version of this plugin. Additional attributes may be added as needed.

Please refer to the Flex Insights documentation to see which attributes are or are not populated by default:

https://www.twilio.com/docs/flex/end-user-guide/insights/data-model

and

https://www.twilio.com/docs/flex/developer/insights/enhance-integration#add-custom-attributes-and-measures

Note: Conversation Labels are associated with their respective Conversations Attributes. If you’re storing a high cardinality value in conversation_label_x, then don’t store anything in conversation_attribute_x. Flex Insights will put the unique segment ID in the matching conversation_attribute. This allows you to use the label to filter a report.

https://www.twilio.com/docs/flex/developer/insights/labels#label-only-for-unique-values

Sample Report


<img width="700px" src="images/CustomMetrics.png"/>


## Setup

Make sure you have [Node.js](https://nodejs.org) as well as [`npm`](https://npmjs.com). We support Node >= 10.12 (and recommend the _even_ versions of Node). Afterwards, install the dependencies by running `npm install`:

```bash
cd 

# If you use npm
npm install
```

Next, please install the [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart) by running:

```bash
brew tap twilio/brew && brew install twilio
```

Finally, install the [Flex Plugin extension](https://github.com/twilio-labs/plugin-flex/tree/v1-beta) for the Twilio CLI:

```bash
twilio plugins:install @twilio-labs/plugin-flex@beta
```

## Development

Run `twilio flex:plugins --help` to see all the commands we currently support. For further details on Flex Plugins refer to our documentation on the [Twilio Docs](https://www.twilio.com/docs/flex/developer/plugins/cli) page.

