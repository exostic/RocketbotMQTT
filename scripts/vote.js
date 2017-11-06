// Description
//   Vote on stuff!
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   hubot start vote item1, item2, item3, ...
//   hubot vote for N - where N is the choice number or the choice name
//   hubot show choices
//   hubot show votes - shows current votes
//   hubot end vote
//
// Notes:
//   None
//
// Author:
//   antonishen

module.exports = function(robot) {
  let tallyVotes;
  robot.voting = {};

  robot.respond(/start vote (.+)$/i, function(msg) {

    if (robot.voting.votes != null) {
      msg.send("A vote is already underway");
      return sendChoices((msg));
    } else {
      robot.voting.votes = {};
      createChoices(msg.match[1]);

      msg.send("Vote started");
      return sendChoices(msg);
    }
  });

  robot.respond(/end vote/i, function(msg) {
    if (robot.voting.votes != null) {
      console.log(robot.voting.votes);

      const results = tallyVotes();

      let response = "The results are...";
      for (let index = 0; index < robot.voting.choices.length; index++) {
        const choice = robot.voting.choices[index];
        response += `\n${choice}: ${results[index]}`;
      }

      msg.send(response);

      delete robot.voting.votes;
      return delete robot.voting.choices;
    } else {
      return msg.send("There is not a vote to end");
    }
  });


  robot.respond(/show choices/i, msg => sendChoices(msg));

  robot.respond(/show votes/i, function(msg) {
    const results = tallyVotes();
    return sendChoices(msg, results);
  });

  robot.respond(/vote (for )?(.+)$/i, function(msg) {
    let choice = null;

    const re = /\d{1,2}$/i;
    if (re.test(msg.match[2])) {
      choice = parseInt(msg.match[2], 10);
    } else {
      choice = robot.voting.choices.indexOf(msg.match[2]);
    }

    console.log(choice);

    const sender = robot.brain.usersForFuzzyName(msg.message.user['name'])[0].name;

    if (validChoice(choice)) {
      robot.voting.votes[sender] = choice;
      return msg.send(`${sender} voted for ${robot.voting.choices[choice]}`);
    } else {
      return msg.send(`${sender}: That is not a valid choice`);
    }
  });

  var createChoices = rawChoices => robot.voting.choices = rawChoices.split(/, /);

  var sendChoices = function(msg, results = null) {

    let response;
    if (robot.voting.choices != null) {
      response = "";
      for (let index = 0; index < robot.voting.choices.length; index++) {
        const choice = robot.voting.choices[index];
        response += `${index}: ${choice}`;
        if (results != null) {
          response += ` -- Total Votes: ${results[index]}`;
        }
        if (index !== (robot.voting.choices.length - 1)) { response += "\n"; }
      }
    } else {
      msg.send("There is not a vote going on right now");
    }

    return msg.send(response);
  };

  var validChoice = function(choice) {
    const numChoices = robot.voting.choices.length - 1;
    return 0 <= choice && choice <= numChoices;
  };

  return tallyVotes = function() {
    let choice;
    const results = ((() => {
      const result = [];
      for (choice of Array.from(robot.voting.choices)) {         result.push(0);
      }
      return result;
    })());

    const voters = Object.keys(robot.voting.votes);
    for (let voter of Array.from(voters)) {
      choice = robot.voting.votes[voter];
      results[choice] += 1;
    }

    return results;
  };
};
