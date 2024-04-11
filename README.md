# Commits Within Time
 A helper action that returns true if commits are detected on a repository within a supplied timeframe.



## Inputs

This is the data that you must set up in your own workflow file to use this action properly. These correspond nicely to the cron schedule values that you can set in a Github Action. 

### seconds 

* Default value: 0
* Required: No
* Purpose: Set how any seconds ago you'd like to check for valid commits.

### minutes

- Default value: 0
- Required: No
- Purpose: Set how many minutes ago you'd like to check for valid commits.

### hours

- Default value: 24
- **Required: Yes**
- Purpose: Set how many hours ago you'd like to check for valid commits.

### days

- Default value: 0
- Required: No
- Purpose: Set how many days ago you'd like to check for valid commits.

### months

- Default value: 0
- Required: No
- Purpose: Set how many months ago you'd like to check for valid commits.

### years

- Default value: 0
- Required: No
- Purpose: Set how many years ago you'd like to check for valid commits.

### usernamesToIgnore

- Default value: `'{"ignoredUsernamesList": ["ExampleBlockedUsername1","ExampleBlockedUsername2"]}'`
- Required: No
- Purpose: Commits authored or committed by usernames included in this array will not count towards 'commits within time'.
- Note: This MUST follow JSON syntax. Github Actions does not currently support proper arrays in their metadata or inputs/outputs. This JSON structure is a dirty hack to make developer-friendly parameters work nicely!

### emailAddressesToIgnore

- Default value: `'{"ignoredEmailAddressesList": ["exampleIgnoredEmail@test.com","exampleIgnoredEmail@email.com"]}'`
- Required: No
- Purpose: Commits authored or committed by emails included in this array will not count towards 'commits within time'.
- Note: This MUST follow JSON syntax. Github Actions does not currently support proper arrays in their metadata or inputs/outputs. This JSON structure is a dirty hack to make developer-friendly parameters work nicely!

### usernamesToFocus

- Default value: `'{"allowedUsernamesList": []}'`
- Required: No
- Purpose: Commits authored or committed by usernames included in this array will not count towards 'commits within time'.
- Note: This MUST follow JSON syntax. Github Actions does not currently support proper arrays in their metadata or inputs/outputs. This JSON structure is a dirty hack to make developer-friendly parameters work nicely!

### emailAddressesToFocus

- Default value: `'{"allowedEmailAddressesList": []}'`
- Required: No
- Purpose: Commits authored or committed by email addresses included in this array will not count towards 'commits within time'.
- Note: This MUST follow JSON syntax. Github Actions does not currently support proper arrays in their metadata or inputs/outputs. This JSON structure is a dirty hack to make developer-friendly parameters work nicely!

### includeGithubActor

- Default value: true
- Required: No
- Purpose: If true, commits authored or committed by the Github user who triggered the current workflow will count towards 'commits within time'. Set to false to ignore their commits instead.

### includeActionsUser

- Default value: false
- Required: No
- Purpose: If true, commits authored or committed by the default Github Actions robot user (eg. "actions-user" or "Github Actions") will count towards 'commits within time'. Set to false to ignore their commits instead. Keep false if you're using this Action to increment & build based on recent commits, as most build/push Actions will appear in commit histories as the Github Actions bot.







## Outputs

This is the data that you can use after this action has completed, in other actions & scripts.

### has-new-commits-within-time

True or false, depending on if commits have been detected with a timestamp within the specified timeframe.



### number-of-commits-within-time

Whole number of commits detected that are within the specified timeframe.



### total-commits

Whole number of commits detected on the repository/branch overall, even the ones not within the specified timeframe.





## Example Usage

For the latest versions of our own example/test workflow, please refer to our `main.yml` file found here:

https://github.com/AlexHolderDeveloper/CommitsWithinTime/blob/main/.github/workflows/main.yml 



The idea with this action is that it can help your scheduled jobs see if there's anything new in your repository commit history to work with. At a most-basic example, you can simple read the values like in this workflow file:

```yaml
on: [push]

jobs:
  example_check_commits_job:
    runs-on: ubuntu-latest
    name: Check for commits within the last 2 hours
    steps:
      - name: Checkout with maximum fetch depth
        uses: actions/checkout@v2
        with:
          fetch-depth: 0
      - name: Run CommitsWithinTime script
        uses: AlexStormwood/CommitsWithinTime@v1.1.12
        id: commitswithintime
        with:
          hours: 2
      # Use the output from the `commitswithintime` step
      - name: Get the output from CommitsWithinTime
        run: |
          echo "The 'has-new-commits-within-time' value is ${{ steps.commitswithintime.outputs.has-new-commits-within-time }}"
          echo "The 'number-of-commits-within-time' value is ${{ steps.commitswithintime.outputs.number-of-commits-within-time }}"
          echo "The 'total-commits' value is ${{ steps.commitswithintime.outputs.total-commits }}"

```

Note that you are REQUIRED to set a `fetch-depth` property when using `actions/checkout@v2` before anything else though. This is because by default, the checkout action does not include any repository commit history. We need this information for the CommitsWithinTime action to work properly! Setting `fetch-depth` to `0` makes it work by getting the maximum amount of commit history from your repository.



For a more-complex usage, you can use this action to enact some control flow into your workflows!

The workflow below runs daily, and only increments a package's PATCH semver number if new commits have been detected in the package repository. It does this by putting an IF expression in each `uses` step. If the expression doesn't evaluate to true, the step doesn't run. Simple!

``` yaml


name: Update UPM semver string

on: 
  schedule:
    # 8pm in GMT+0 is just before the start of a workday here in SYD, so this will run before devs start working!
    - cron:  '0 20 * * *'

jobs:
  create:
    name: Update UPM semver string value
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
      with:
        fetch-depth: 0
    
    - name: Check for commits within time 
      uses: AlexStormwood/CommitsWithinTime@v1.1.12
      id: commitswithintime
      with:
        hours: 24

    - name: Get the output from CommitsWithinTime
      run: |
        echo "The 'has-new-commits-within-time' value is ${{ steps.commitswithintime.outputs.has-new-commits-within-time }}"
        echo "The 'number-of-commits-within-time' value is ${{ steps.commitswithintime.outputs.number-of-commits-within-time }}"
        echo "The 'total-commits' value is ${{ steps.commitswithintime.outputs.total-commits }}"


    - name: Find UPM package.json & increment its version number
      uses: AlexStormwood/UnityUPMSemver@v1.0.0 
      id: semver-update-upm
      if: steps.commitswithintime.outputs.has-new-commits-within-time
      with:
        semver-update-type: 'patch' 
        upm-package-directory: '/Packages/BigfootDSUnityCore/'

    - name: Get the new semver number
      if: steps.commitswithintime.outputs.has-new-commits-within-time
      run: echo "The new semver number for this Unity project is ${{ steps.semver-update-upm.outputs.semver-number }}"

    - name: Push changed files back to repo
      uses: stefanzweifel/git-auto-commit-action@v5
      if: steps.commitswithintime.outputs.has-new-commits-within-time
      with:
        commit_message: "Updated UPM semver via automated action."
        commit_options: '--no-verify --signoff'
```







## To-Do List

- General code optimizations
- Create more example workflows
