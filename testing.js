const core = require('@actions/core');
const github = require('@actions/github');
const linear = require("@linear/sdk");
const linearClient = new linear.LinearClient({ 'apiKey': process.env.LINEAR_API_KEY });

let statesCache = {};
let stateIds = {};

let ref_head = process.env.GITHUB_HEAD_REF; // "refs/heads/feature/doc-490-evaluate-pull-request-deployment-of"
// let body = 'Hello I am a robot 🤖 [G](https://google.com)'
const body = '> cypress-test (861551c5) of docuvision/Redacted.ai@refs/heads/master by Adam Skoczylas<skocadam@gmail.com> failure in 7 min 11 sec'; // core.getInput('message');
const title = '🥵 QA - cypress.redacted.ai FAILED @ Feb 12, 2022 4:12pm'; // core.getInput('topic');
const team = 'Front-end Team'; // core.getInput('team');
const label = 'Cypress Fails'; // core.getInput('label');
const state = 'Draft'; // core.getInput('state');

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

      const options = {
        teamId,
        title,
        labelIds,
        description: body,
        stateId
      };

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
  const { nodes: labels } = await team.labels();
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
  const availabelStatesInTeam = await linearWorkflowStatesList(teamId);
  const foundState = availabelStatesInTeam.find((state) => state.name === desiredState);
  if (!foundState) {
    throw new Error(`Not found state "${foundState}" in team ${teamId}`);
  }

  return foundState.id;
}

async function linearWorkflowStatesList(teamId) {
  // create a cache for states for team
  if (statesCache && statesCache[teamId] && statesCache[teamId].length > 0) {
    return statesCache[teamId];
  }
  const { nodes: states } = await linearClient.workflowStates({ first: 100 });
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
}

main();
