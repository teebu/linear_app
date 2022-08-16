# Linear App github acton

This action posts a comment in a related linear ticket

## Inputs

### `message`

**Required** The message you want to be displayed in the comment. Default `"I am a robot"`.

## Inputs

### `title`

If title is provided, a new ticket will be created with body.

## Inputs

### `team`

## Inputs

### `label`

## Inputs

### `state`


## Outputs

### `time`

The time the ticket was created.

## Example usage

```
- name: Create Linear Comment
id: linear_app
uses: teebu/linear_app@v1.10
with:
  message: |
    Great success!
env:
  LINEAR_API_KEY: KEYHERE
```

## Tags:
git push --delete origin v1.10.5
git tag -a v1.10.5 -m "update version"  
git push origin v1.10.5
