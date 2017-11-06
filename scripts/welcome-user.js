// Description
//   Hubot script to welcome new users to Rocket.Chat or a Rocket.Chat room (via a DM as default)
//
// Configuration:
//   ROCKETCHAT_USER so the bot can introduce itself using its @username
//   WELCOME_MESSAGE String, what the bot says to new users
//   DIRECT_WELCOME Bool (default true), welcome users by direct message, instead of posting in the room they joined
//   GLOBAL_WELCOME Bool (default true), welcome only once per user across all rooms, false will welcome once per room
//
// Commands:
//   hubot say welcome - Repeats the bot's welcome message.
//
// Notes:
//   TODO: Allow setting a welcome messsage by environment OR a command
//   TODO: Allow role authentication to decide who can set a new welcome message
//
// Author:
//   Tim Kinnane @ 4thParty

const botName = process.env.ROCKETCHAT_USER; // or robot.name
const welcomeMessage = process.env.WELCOME_MESSAGE || `Welcome, I'm @${ botName }. If you need help just reply with \`help\``;
const directWelcome = process.env.DIRECT_WELCOME === 'false' ? false : true;
const globalWelcome = process.env.GLOBAL_WELCOME === 'false' ? false : true;
const isDebug = process.env.HUBOT_LOG_LEVEL === 'debug' ? true : false;

module.exports = function(robot) {

  const welcoming = globalWelcome ? 'any new users' : 'new users in room';
  robot.logger.info(`Welcome script is running, will send to ${ welcoming } saying:`);
  robot.logger.info(`\"${ welcomeMessage }\"`);

  // get robot brain collection pointer when DB merged in
  robot.brain.on('loaded', () => {
    if (robot.brain.get('welcomed_users') === null) {
      return robot.brain.set('welcomed_users', []);
    }
});

  // prepare user object for storing in brain
  // NB: userForId returns object of class User, but when persistent memory is saved/reloaded, it loses class
  // for that reason comparison fails and causes bug recognising users, so we remove the class from the beginning
  const getUser = function(msg) {
    const user = robot.brain.userForId(msg.message.user.id, {name: msg.message.user.name, room: msg.message.room});
    return JSON.parse(JSON.stringify(user));
  };

  // determine if the user has been welcomed before
  // if global welcomes, matches on ID alone
  // otherwise, matches on whole user object so same user in different room will still be welcomed
  const userIsKnown = function(user) {
    let found;
    let u;
    if (globalWelcome) {
      found = ((() => {
        const result = [];
        for (u of Array.from(robot.brain.get('welcomed_users'))) {           if (u.id === user.id) {
            result.push(u);
          }
        }
        return result;
      })())[0];
    } else {
      found = ((() => {
        const result1 = [];
        for (u of Array.from(robot.brain.get('welcomed_users'))) {           if ((u.id === user.id) && (u.room === user.room)) {
            result1.push(u);
          }
        }
        return result1;
      })())[0];
    }
    return typeof found === 'object';
  };

  // store welcomed user in brain
  const rememberUser = function(user) {
    if (!userIsKnown(user)) {
      robot.brain.get('welcomed_users').push(user);
    }
    return robot.brain.save();
  };

  // send welcome message if user unrecognized, or if forced
  // sends via direct unless told otherwise, remembers who it's sent to
  const welcomeUser = function(msg, forced, direct) {
    if (forced == null) { forced = false; }
    if (direct == null) { direct = true; }
    const user = getUser(msg);
    const known = userIsKnown(user);
    if (forced || !known) {
      if (direct) {
        msg.sendDirect(welcomeMessage);
      } else {
        msg.send(`@${ msg.message.user.name } ${ welcomeMessage }.`);
      }
      // msg.send welcomeMessage
      if (!known) {
        return rememberUser(user);
      }
    }
  };

  // on user first entering a room with the bot
  robot.enter(msg => welcomeUser(msg, false, directWelcome));

  // reply in current room if forced to say welcome
  robot.respond(/say welcome/, msg => welcomeUser(msg, true, false));

  // register debug only listeners
  if (isDebug) {

    // remove user from brain
    robot.respond(/forget me/, function(msg) {
      const user = getUser(msg);
      const welcomedUsers = robot.brain.get('welcomed_users');
      if (globalWelcome) {
        robot.brain.set('welcomed_users', welcomedUsers.filter(u => !( u.id === user.id )));
      } else {
        robot.brain.set('welcomed_users', welcomedUsers.filter(u => !( (u.id === user.id) && (u.room === user.room) )));
      }
      robot.brain.save();
      return msg.send(userIsKnown(user) ?  "For some reason, I just can't forget you." : "Who said that?");
    });

    // debug status of user in brain
    robot.respond(/have we met/, function(msg) {
      if (userIsKnown(getUser(msg))) {
        return msg.send(`Yes ${ msg.message.user.name }, we've met, but you can instruct me to \`say welcome\` again.`);
      } else {
        return msg.send(`No ${ msg.message.user.name }, I don't believe we have. Please instruct me to \`say welcome\`.`);
      }
    });

    // debug entire brain in console
    return robot.respond(/brain dump/, msg => console.log(robot.brain.get('welcomed_users')));
  }
};
