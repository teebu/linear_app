const core = require('@actions/core');
const github = require('@actions/github');
const linear = require("@linear/sdk");
const utils = require('./utils');

const linearClient = new linear.LinearClient({ 'apiKey': process.env.LINEAR_API_KEY });

let statesCache = {};
let stateIds = {};

let ref_head = process.env.GITHUB_HEAD_REF; // "refs/heads/feature/doc-490-evaluate-pull-request-deployment-of"
// let body = 'Hello I am a robot 🤖 [G](https://google.com)'
const title = utils.replacePlaceholders('🥵 QA-Bot Tests Failed → Nightly Preview Release Canceled for {DATE}'); // core.getInput('title');
const body = utils.replacePlaceholders('> Cypress test failed: link'); // core.getInput('message');
const team = 'Redaction Core'; // core.getInput('team');
const label = 'PR Review'; // core.getInput('label');
const state = 'Draft'; // core.getInput('state');
const subscribers = utils.splitAndTrim(null); // core.getInput('subscribers');

async function main() {
  if (!title && body) {
    console.log('creating comment');
    // create a comment in a related issue found by ref PR branch
    try {
      const payload = JSON.stringify(github.context.payload, undefined, 2);
      const issueId = parse_ref(ref_head);
      await createComment(issueId, body);
    }
    catch (err) {
      core.setFailed(err.message);
    }
  } else if (title && body && team) {
    // create a new issue with description in specified team
    try {
      console.log('creating new issue');
      const teamId = await getTeamId(team);
      const labelIds = [await getLabelId(teamId, label)];
      const stateId = await getStateId(teamId, state);
      const subscriberIds = await getSubscriberIds(subscribers);

      const options = {
        teamId,
        title,
        labelIds,
        description: body,
        stateId
      };

      // add subscribers to ticket
      if (subscriberIds && subscriberIds.length > 0)
        options.subscriberIds = subscriberIds;

      await issueCreate(options);
    }
    catch (err) {
      core.setFailed(err.message);
    }
  } else {
    core.setFailed('missing required fields');
  }
}


// parse title, body, ref of git pull request and get the 'doc-id'
function parse_ref(ref_head) {
  // the pull request GITHUB_REF "doc-490-evaluate-pull-request-deployment-of", "fe-4390-message"
  console.log('ref_head:', ref_head);

  if (!ref_head) return null;

  const re = /\b([a-z]{2,3}-\d+)\b/i;
  console.log(ref_head.match(re));
  return ref_head.match(re) && ref_head.match(re)[0];
}

async function createComment(issueId, body) {
  if (!issueId) {
    console.log('no issueId detected, skipping posting comment');
    return;
  }

  const commentPayload = await linearClient.commentCreate({ issueId, body });
  if (commentPayload.success) {
    console.log(await commentPayload.comment);

    const time = (new Date()).toTimeString();
    core.setOutput("time", time);

    return await commentPayload.comment;
  } else {
    return new Error("Failed to create comment");
  }
}

async function issueCreate(options) {
  const createPayload = await linearClient.issueCreate(options);
  if (createPayload.success) {
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
    return true;
  } else {
    return new Error("Failed to create comment");
  }
}

async function getLabelId(teamId, desiredLabel) {
  // get labels for team
  const team = await linearClient.team(teamId);
  const { nodes: labels } = await team.labels({first:200});
  const label = labels.find((label) => label.name.toLowerCase() === desiredLabel.toLowerCase());
  if (!label) {
    throw new Error(`Not found label "${desiredLabel}" in team ${teamId}`);
  }

  return label.id;
}

async function getTeamId(desiredTeam) {
  // get labels for team
  const teams = await linearClient.teams();
  const team = teams.nodes.find((team) => team.name.toLowerCase() === desiredTeam.toLowerCase());
  if (!team) {
    throw new Error(`Not found team "${desiredTeam}"`);
  }

  return team.id;
}

async function getStateId(teamId, desiredState) {
  const availableStatesInTeam = await linearWorkflowStatesList(teamId);
  const foundState = availableStatesInTeam.find((state) => state.name === desiredState);
  if (!foundState) {
    throw new Error(`Not found state "${foundState}" in team ${teamId}`);
  }

  return foundState.id;
}

/*async function linearWorkflowStatesList(teamId) {
  // create a cache for states for team
  if (statesCache && statesCache[teamId] && statesCache[teamId].length > 0) {
    return statesCache[teamId];
  }
  const { nodes: states } = await linearClient.workflowStates({ first: 250 });
  const teamStates = (
    await Promise.all(
      states.map(async (state) => {
        const found = await state.team;
        if (found.id === teamId) {
          // There is state in required team
          return state;
        }
        return null;
      }),
    )
  ).filter((state) => state !== null);
  statesCache[teamId] = teamStates;
  return teamStates;
}*/

async function linearWorkflowStatesList(teamId) {
  // create a cache for states for team
  if (statesCache && statesCache[teamId] && statesCache[teamId].length > 0) {
    return statesCache[teamId];
  }

  const { nodes: states } = await linearClient.workflowStates({ first: 250 });

  states.forEach(state => {
    if (state._team.id && state) {
      if (!statesCache[state._team.id]) statesCache[state._team.id] = [];
      statesCache[state._team.id].push({ id: state.id, name: state.name });
    }
  });

  return statesCache[teamId];
}

async function getSubscriberIds(names) {
  // create an array of user ids for subscribers
  const userIds = [];

  for (const name of names) {
    const user = await linearUserFind(name);
    const id = user && user.id;
    if (id) userIds.push(id);
  }
  return userIds;
}

async function linearUserFind(userName) {
  if (!userName) userName = '';

  const { nodes: found } = await linearClient.users({
      includeArchived: false,
      first: 100, // limit of 100
      // filter: {
      //     displayName: { eq: userName }
      //   }
    }
  );
  if (found.length === 0) return null;

  return found.find((user) => user.displayName.toLowerCase() === userName.toLowerCase()) || null;
}

main();
