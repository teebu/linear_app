const linear = require("@linear/sdk");
const linearClient = new linear.LinearClient({ 'apiKey': process.env.LINEAR_API_KEY });


let ref_head = process.env.CI_HEAD_REF_SLUG //"doc-490-evaluate-pull-request-deployment-of"
let body = 'Hello I am a robot 🤖 [G](https://google.com)'
const issueId = parse_ref(ref_head)
createComment(issueId, body)


// todo: parse title, body, ref_slug of git pull request and get the 'doc-id'
function parse_ref(ref_head) {
  // the pull request CI_HEAD_REF_SLUG "doc-490-evaluate-pull-request-deployment-of"
  if (!ref_head) return null;

  const re = /(doc-\d+)/i
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
    return commentPayload.comment;
  } else {
    return new Error("Failed to create comment");
  }
}

