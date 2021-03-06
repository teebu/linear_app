const core = require('@actions/core');
const github = require('@actions/github');
const linear = require("@linear/sdk");
const linearClient = new linear.LinearClient({ 'apiKey': process.env.LINEAR_API_KEY });


let ref_head = process.env.GITHUB_HEAD_REF // "refs/heads/feature/doc-490-evaluate-pull-request-deployment-of"
// let body = 'Hello I am a robot 🤖 [G](https://google.com)'
let body = core.getInput('message');

try {
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  const issueId = parse_ref(ref_head)
  createComment(issueId, body)
} catch(err) {
  core.setFailed(err.message);
}

// todo: parse title, body, ref of git pull request and get the 'doc-id'
function parse_ref(ref_head) {
  // the pull request GITHUB_REF "doc-490-evaluate-pull-request-deployment-of", "fe-4390-message"
  console.log('ref_head:', ref_head)

  if (!ref_head) return null;

  const re = /\b([a-z]{2,3}-\d+)\b/i
  console.log(ref_head.match(re))
  return ref_head.match(re) && ref_head.match(re)[0]
}


async function createComment(issueId, body) {
  if (!issueId) {
    console.log('no issueId detected, skipping posting comment');
    return;
  }

  const commentPayload = await linearClient.commentCreate({issueId, body});
  if (commentPayload.success) {
    console.log(await commentPayload.comment)

    const time = (new Date()).toTimeString();
    core.setOutput("time", time);

    return commentPayload.comment;
  } else {
    return new Error("Failed to create comment");
  }
}

