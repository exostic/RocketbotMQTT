// Description:
//   Subscribe/Publish to an MQTT server with client-side certificate auth over TLS
//
// Dependencies:
//   mqtt,fs
//
// Configuration:
//
// Commands:
//   hubot hello - <what the respond trigger does>
//   orly - <what the hear trigger does>
//   hubot mqtt publish <topic> <message>   - Publish a message on a topic
//   hubot mqtt subscribe <topic>           - Subscribe to a topic
//   hubot mqtt unsubscribe <topic>         - Unsubscribe to a topic
//   hubot mqtt reconnect                   - Reconnect to MQTT Broker
// Notes:
//   <optional notes required for the script>

const fs = require('fs');
const mqtt = require('mqtt');
const mqttPattern = require("mqtt-pattern");

const MQTT_URL = process.env.HUBOT_MQTT_URL;
const HOST = process.env.HUBOT_MQTT_HOST;
const PORT = process.env.HUBOT_MQTT_PORT;
const CLIENT_ID = process.env.HUBOT_MQTT_CLIENT_ID;
const USERNAME = process.env.HUBOT_MQTT_USERNAME;
//const PASSWORD = new Buffer(process.env.HUBOT_MQTT_PASSWORD);
const PASSWORD = new Buffer('password');

// block comment out the rest of this block if no tls
ca_file = process.env.HUBOT_MQTT_CA_CERT;
// block comment out the rest of these varibles if no client_cert auth
//client_key_file  = process.env.HUBOT_MQTT_CLIENT_KEY
//client_cert_file = process.env.HUBOT_MQTT_CLIENT_CERT
TRUSTED_CA_LIST  = fs.readFileSync(ca_file);
//KEY              = fs.readFileSync("#{client_key_file}")
//CERT             = fs.readFileSync("#{client_cert_file}")

const mqttOptions = {
//  protocolId: 'MQIsdp',
  protocolId: 'MQTT',
//  protocolVersion: 3,
  protocolVersion: 4,
  host: HOST,
  port: PORT,
  clientId : CLIENT_ID,
  username : USERNAME,
  password : PASSWORD,
//  password: new Buffer('varda'),
// block comment out the rest of thes if no tls
  ca: TRUSTED_CA_LIST,
  rejectUnauthorized: false,
// block comment out the rest of these if no client_cert auth
//  protocol: 'mqtts',
//  secureProtocol: 'TLSv1_method',
//  key: KEY,
//  cert: CERT,
//  ciphers: 'ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-RSA-RC4-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES128-SHA:AES256-SHA256:AES256-SHA:RC4-SHA:!aNULL:!eNULL:!LOW:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS:!EDH'
};

let mqttClient = mqtt.connect(MQTT_URL, mqttOptions);

mqttClient.on('connect', () => console.log(`Connected to MQTT broker @ ${process.env.HUBOT_MQTT_HOST}:${process.env.HUBOT_MQTT_PORT}`));

const OUT_TOPIC = process.env.HUBOT_MQTT_OUT_TOPIC;
const IN_TOPIC = process.env.HUBOT_MQTT_IN_TOPIC;

mqttClient.subscribe(OUT_TOPIC);

module.exports = function(robot) {

  let itopic, room, topics;
  robot.respond(/hello/, res => res.reply("hello!"));

  robot.hear(/orly/, res => res.send("yarly"));

  robot.hear(/keyword/i, function(req) {
    res.send({ reply_markup: { keyboard: [ [ "Yes", "No" ] ] } });
    return req.send("I heard the keyword, am I right?");
  });

  robot.respond(/show room/, res => res.reply(`The room's ID is ${res.message.room}.`));

// MQTT Bridge 

  const getParams = function(topic) {
    const pattern = "hermes/intent/+intentName/#data";
    const params = mqttPattern.exec(pattern, topic);
    console.log(`Intent Received ${params.intentName}`);
    robot.brain.set('mqtt-pattern',params);
    return robot.brain.save;
  };

  const filterPayload = function(topic) {
    if (params[data] != null) {
      switch (params[data]) {
        case "weatherForecastLocality" :
          break;
      }
      return message.send(`Message filtré : [ ` + params[data].join(', ') + " ]");
    } else {
      return message.send("Could not filter data");
    }
  }
 
  mqttClient.on('message', function(topic,message) {

    console.log(`received ${message} from [${topic}]`);
    //robot.messageRoom(OUT_TOPIC, `received ${message} from [${topic}]`);
    //getParams(topic);
    //  case ""
    //}
    return (() => {
      const result = [];
      for (room in subscriptions) {
        topics = subscriptions[room];
        result.push((() => {
          const result1 = [];
          for (itopic in topics) {
            const reg = new RegExp(topics[itopic].replace('+', '[^\/]+').replace('#', '.+') + '$');
            const matches = topic.match(reg);
            if(matches) {
              result1.push(robot.messageRoom(room, `received ${message} from [${topic}]`));
            } else {
              result1.push(undefined);
            }
          }
          return result1;
        })());
      }
      return result;
    })();
  });

// MQTT Hubot Control

  let subscriptions = robot.brain.get('mqtt-subscriptions');
  if (subscriptions != null) {
    for (room in subscriptions) {
      topics = subscriptions[room];
      for (itopic in topics) {
        mqttClient.subscribe(topics[itopic]);
      }
    }
  }
  if ((subscriptions == null)) {
    subscriptions = {};
    subscriptions[OUT_TOPIC] = [];
  }
  if (typeof topic !== 'undefined' && topic !== null) {
    subscriptions[OUT_TOPIC].push(topic); // subscribe to the initial env topic if given
  }

  robot.respond(/mqtt subscribe (.*)/i, function(message) {
    ({ room } = message.message);
    const topic = message.match[1];
    mqttClient.subscribe(message.match[1]);
    message.send(`${room} subscribed to ${topic}`);
    if ((subscriptions[room] == null)) {
      subscriptions[room] = [];
    }
    subscriptions[room].push((message.match[1]));
    robot.brain.set('mqtt-subscriptions',subscriptions);
    return robot.brain.save;
  });

  robot.respond(/mqtt unsubscribe (.*)/i, function(message) {
    const topic = message.match[1];
    ({ room } = message.message);
    mqttClient.unsubscribe(topic);
   // message.send("#{room} unsubscribed from #{topic}")
    if ((subscriptions[room] == null)) {
      subscriptions[room] = [];
    }
    const index = subscriptions[room].indexOf(topic);
    if (index !== -1) { subscriptions[room].splice(index,1); }
    robot.brain.set('mqtt-subscriptions',subscriptions);
    return robot.brain.save;
  });

  robot.respond(/mqtt\s+publish\s+(\S+)\s+(.*)/i, function(message) {
    mqttClient.publish( message.match[1], message.match[2] );
    return message.send(`message ${message.match[2]}, published to [${message.match[1]}]`);
  });

  robot.respond(/mqtt reconnect/i, message => mqttClient = mqtt.connect(process.env.HUBOT_MQTT_URL, options));

  return robot.respond(/mqtt (subscriptions|subscribed|topics)/i, function(message) {
    ({ room } = message.message);
    if (subscriptions[room] != null) {
      return message.send(`${room} is subscribed to [ ` + subscriptions[room].join(', ') + " ]");
    } else {
      return message.send(`${room} is not subscribed to any topics`);
    }
  });
};
