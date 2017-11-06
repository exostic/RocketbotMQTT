# Description:
#   Subscribe/Publish to an MQTT server with client-side certificate auth over TLS
#
# Dependencies:
#   mqtt,fs
#
# Configuration:
#
# Commands:
#   hubot hello - <what the respond trigger does>
#   orly - <what the hear trigger does>
#   hubot mqtt publish <topic> <message>   - Publish a message on a topic
#   hubot mqtt subscribe <topic>           - Subscribe to a topic
#   hubot mqtt unsubscribe <topic>         - Unsubscribe to a topic
#   hubot mqtt reconnect                   - Reconnect to MQTT Broker
# Notes:
#   <optional notes required for the script>

fs = require('fs')
mqtt = require('mqtt')
mqttPattern = require("mqtt-pattern");

mqttUrl = process.env.HUBOT_MQTT_URL
HOST = process.env.HUBOT_MQTT_HOST
PORT = process.env.HUBOT_MQTT_PORT
# block comment out the rest of this block if no tls
#ca_file          = process.env.HUBOT_MQTT_CA_CERT
# block comment out the rest of these varibles if no client_cert auth
#client_key_file  = process.env.HUBOT_MQTT_CLIENT_KEY
#client_cert_file = process.env.HUBOT_MQTT_CLIENT_CERT
#TRUSTED_CA_LIST  = fs.readFileSync("#{ca_file}")
#KEY              = fs.readFileSync("#{client_key_file}")
#CERT             = fs.readFileSync("#{client_cert_file}")


mqttOptions =
  protocolId: 'MQIsdp'
  protocolVersion: 3
  host: HOST
  port: PORT
#  username: 'varda'
#  password: new Buffer('varda')
# block comment out the rest of thes if no tls
#  ca: TRUSTED_CA_LIST
#  rejectUnauthorized: true
# block comment out the rest of these if no client_cert auth
#  protocol: 'mqtts'
#  secureProtocol: 'TLSv1_method'
#  key: KEY
#  cert: CERT
#  ciphers: 'ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-RSA-RC4-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES128-SHA:AES256-SHA256:AES256-SHA:RC4-SHA:!aNULL:!eNULL:!LOW:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS:!EDH'

mqttClient = mqtt.connect(mqttUrl, mqttOptions)

mqttClient.on 'connect', ->
  console.log "Connected to MQTT broker @ #{process.env.HUBOT_MQTT_HOST}:#{process.env.HUBOT_MQTT_PORT}"

outTopic = process.env.HUBOT_MQTT_OUT_TOPIC
inTopic = process.env.HUBOT_MQTT_IN_TOPIC

mqttClient.subscribe(outTopic)

module.exports = (robot) ->

  robot.respond /hello/, (res) ->
    res.reply "hello!"

  robot.hear /orly/, (res) ->
    res.send "yarly"

  robot.hear /keyword/i, (req) ->
    res.send({ reply_markup: { keyboard: [ [ "Yes", "No" ] ] } })
    req.send "I heard the keyword, am I right?"

# Utilities

  robot.respond /show room/, (res) ->
    res.reply "The room's ID is #{res.message.room}."

 # MQTT Bridging
  
  # Wildcards in patterns don't need names
  pattern = "device/+id/+/#data"
  topic = "device/fitbit/heartrate/rate/bpm"
  params = mqttPattern.exec(pattern, topic)

  subscriptions = robot.brain.get('mqtt-subscriptions')
  if subscriptions?
    for room, topics of subscriptions
      for itopic of topics
        mqttClient.subscribe(topics[itopic])
  if ! subscriptions?
    subscriptions = {}
    subscriptions[outTopic] = []
  if topic?
    subscriptions[outTopic].push(topic) # subscribe to the initial env topic in #mqtt if given
 
  mqttClient.on('message', (topic,message) ->
    #message.send("[#{topic}] #{message}")
    robot.messageRoom(outTopic, "received #{message} from [#{topic}]")
    for room, topics of subscriptions
      for itopic of topics
        reg = new RegExp(topics[itopic].replace('+', '[^\/]+').replace('#', '.+') + '$');
        matches = topic.match(reg);
        if(matches)
          robot.messageRoom(room, "received #{message} from [#{topic}]")
  )

  robot.respond /mqtt subscribe (.*)/i, (message) ->
    room = message.message.room
    topic = message.match[1]
    mqttClient.subscribe(message.match[1])
    message.send("#{room} subscribed to #{topic}")
    if ! subscriptions[room]?
      subscriptions[room] = []
    subscriptions[room].push (message.match[1])
    robot.brain.set('mqtt-subscriptions',subscriptions)
    robot.brain.save

  robot.respond /mqtt unsubscribe (.*)/i, (message) ->
    topic = message.match[1]
    room = message.message.room
    mqttClient.unsubscribe(topic)
    message.send("#{room} unsubscribed from #{topic}")
    if ! subscriptions[room]?
      subscriptions[room] = []
    index = subscriptions[room].indexOf(topic)
    subscriptions[room].splice(index,1) unless index == -1
    robot.brain.set('mqtt-subscriptions',subscriptions)
    robot.brain.save

  robot.respond /mqtt\s+publish\s+(\S+)\s+(.*)/i, (message) ->
    mqttClient.publish( message.match[1], message.match[2] )
    message.send("message #{message.match[2]}, published to [#{message.match[1]}]")

  robot.respond /mqtt reconnect/i, (message) ->
    mqttClient = mqtt.connect(process.env.HUBOT_MQTT_URL, options)

  robot.respond /mqtt (subscriptions|subscribed|topics)/i, (message) ->
    room = message.message.room
    if subscriptions[room]?
      message.send("#{room} is subscribed to [ " + subscriptions[room].join(', ') + " ]")
    else
      message.send("#{room} is not subscribed to any topics")
