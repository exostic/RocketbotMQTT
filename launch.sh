#!/bin/bash
export ROCKETCHAT_URL=https://chat.aloes.io
export ROCKETCHAT_USER=dave
export ROCKETCHAT_PASSWORD='motdepasse'
export HUBOT_ADAPTER=rocketchat
export HUBOT_OWNER=ed@getlarge.eu
export HUBOT_NAME='nubot'
export HUBOT_DESCRIPTION="MQTT bot"
export ROCKETCHAT_ROOM=''
export RESPOND_TO_DM=true
export RESPOND_TO_LIVECHAT=true
export LISTEN_ON_ALL_PUBLIC=true
export ROCKETCHAT_AUTH=password
export HUBOT_LOG_LEVEL=debug
export HUBOT_MQTT_URL='mqtt://192.168.1.84'
export HUBOT_MQTT_HOST='192.168.1.84'
export HUBOT_MQTT_PORT='1883'
export HUBOT_MQTT_TOPIC='/hermes/hotword/#'
bin/hubot -a rocketchat
