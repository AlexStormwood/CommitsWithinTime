const core = require('@actions/core');
const github = require('@actions/github');
const artifact = require('@actions/artifact');
const artifactClient = artifact.create()
const artifactName = 'outputCommitsWithinTime';
const fs = require('fs');
const resolve = require('path').resolve;

var { execSync } = require("child_process");

const gitCommand = 'git rev-list --remotes --format="CommitHash:%H%nAuthor:%an%nEmail:%ae%nCommitterAuthor:%cn%nCommitterEmail:%ce%nDate:%ct%nMessage:%s"';

var hasNewCommitsWithinTime = false;
var numberOfCommitsWithinTime = 0;
var totalCommits = 0;

var secondsRange = core.getInput("seconds") || 0;
var minutesRange = core.getInput("minutes") || 0;
var hoursRange = core.getInput("hours") || 24;
var daysRange = core.getInput("days") || 0;
var monthsRange = core.getInput("months") || 0;
var yearsRange = core.getInput("years") || 0;
var usernamesToIgnore = JSON.parse(core.getInput("usernamesToIgnore")).ignoredUsernamesList || [];
var emailAddressesToIgnore = JSON.parse(core.getInput("emailAddressesToIgnore")).ignoredEmailAddressesList || [];
var usernamesToFocus = JSON.parse(core.getInput("usernamesToFocus")).allowedUsernamesList || [];
var emailAddressesToFocus = JSON.parse(core.getInput("emailAddressesToFocus")).allowedEmailAddressesList || [];
var includeGithubActor = core.getInput("includeGithubActor") || true;
var includeActionsUser = core.getInput("includeActionsUser") || false;

var shouldWriteToFile = core.getInput("exportToFile") || false;
var outputObj = {
    hasNewCommitsWithinTime: false,
    numberOfCommitsWithinTime: 0,
    totalCommits: 0
}

// Make sure our Github Actor is not ignored if that option is set to true
if (includeGithubActor){
    let index = 0;
    while (index < usernamesToIgnore.length){
        if (usernamesToIgnore[index] === process.env.GITHUB_ACTOR){
            usernamesToIgnore.splice(index, 1);
        } else {
            index++;
        }
    }
}

if (!includeActionsUser) {
    usernamesToIgnore.push("actions-user");
    usernamesToIgnore.push("Github Actions");
    emailAddressesToIgnore.push("actions@github.com")
    emailAddressesToIgnore.push(process.env.GITHUB_ACTOR + "@users.noreply.github.com");
}



function gitCommitInfoObj(commitHash, author, authorEmail, committerAuthor, committerEmail, date, message) {
    return {
        commitHash: commitHash,
        author: author,
        authorEmail: authorEmail,
        committerAuthor: committerAuthor,
        committerEmail: committerEmail,
        date: new Date(date * 1000),
        message: message
    };
}

function getGitRevMegaString() {
    return execSync(gitCommand).toString();
}

function gatherInfoOnCommitsWithinTime() {

    var gitRevHistoryMegaString = getGitRevMegaString();

    let gitMegaStringLines = gitRevHistoryMegaString.split(/(\bcommit \b)(\w*)/);
    gitMegaStringLines = gitMegaStringLines
        .map(item => {
            // Remove whitespace from valid strings
            item = item.trim();
            if (
                item.startsWith("CommitHash") || 
                item.startsWith("Author:") || 
                item.startsWith("Email:") ||
                item.startsWith("CommitterAuthor:") || 
                item.startsWith("CommitterEmail:") || 
                item.startsWith("Date:") || 
                item.startsWith("Message:")
                ) {
                return item;
            }
        })
        .filter(item => {
            // Remove null, empty or otherwise falsey strings
            return item
        });
    // console.log(gitMegaStringLines[0])
    
    var gitCommitObjs = [];

    gitMegaStringLines.forEach(commitMegaString => {
        let individualLines = commitMegaString.split("\n");

        let commitHash = individualLines[0].substring(individualLines[0].indexOf(":") + 1);
        let author = individualLines[1].substring(individualLines[1].indexOf(":") + 1);
        let email = individualLines[2].substring(individualLines[2].indexOf(":") + 1);
        let committerAuthor = individualLines[3].substring(individualLines[3].indexOf(":") + 1);
        let committerEmail = individualLines[4].substring(individualLines[4].indexOf(":") + 1);
        let date = individualLines[5].substring(individualLines[5].indexOf(":") + 1);
        let message = individualLines[6].substring(individualLines[6].indexOf(":") + 1);

        gitCommitObjs.push(gitCommitInfoObj(commitHash, author, email, committerAuthor, committerEmail, date, message))
    })

    // console.log(JSON.stringify(gitCommitObjs[0]))

    totalCommits = gitCommitObjs.length;
    core.setOutput("total-commits", totalCommits);

    var maxDate = new Date(Date.now());
    var minDate = new Date(Date.now());
    minDate.setFullYear(minDate.getFullYear() - yearsRange);
    minDate.setMonth(minDate.getMonth() - monthsRange);
    minDate.setDate(minDate.getDate() - daysRange);
    minDate.setHours(minDate.getHours() - hoursRange);
    minDate.setMinutes(minDate.getMinutes() - minutesRange);
    minDate.setSeconds(minDate.getSeconds() - secondsRange);

    console.log(`Only allowing commits from between now \n(timestamp of ${maxDate.toUTCString()}) \n& this timestamp: \n${minDate.toUTCString()}`);

    gitCommitObjs.forEach(element => {
        console.log(element.date);
        if (
            (element.date > minDate && element.date <= maxDate) && 
            usernamesToIgnore && (!usernamesToIgnore.includes(element.author)) && (!usernamesToIgnore.includes(element.committerAuthor)) && 
            emailAddressesToIgnore && (!emailAddressesToIgnore.includes(element.authorEmail)) && (!usernamesToIgnore.includes(element.committerEmail))
            ) {

            if (usernamesToFocus.length > 0){
                if (usernamesToFocus.includes(element.author) || usernamesToFocus.includes(element.committerAuthor)){

                    hasNewCommitsWithinTime = true;
                    numberOfCommitsWithinTime++;
                    console.log("------------");
                    console.log("This commit DOES meet the criteria that you wanted:");
                    console.log(JSON.stringify(element));
                    console.log("------------");
                } else {
                    console.log("------------");
                    console.log("This commit was within the timeframe that you wanted, but was not authored or committed by someone in your usersnamesToFocus list:");
                    console.log(JSON.stringify(element));
                    console.log("------------");                
                }
            } 
            if (emailAddressesToFocus.length > 0) {
                if (emailAddressesToFocus.includes(element.author) || emailAddressesToFocus.includes(element.committerAuthor)){

                    hasNewCommitsWithinTime = true;
                    numberOfCommitsWithinTime++;
                    console.log("------------");
                    console.log("This commit DOES meet the criteria that you wanted:");
                    console.log(JSON.stringify(element));
                    console.log("------------");
                } else {
                    console.log("------------");
                    console.log("This commit was within the timeframe that you wanted, but was not authored or committed by someone in your emailAddressesToFocus list:");
                    console.log(JSON.stringify(element));
                    console.log("------------");                
                }
            } 
            
            if (emailAddressesToFocus.length > 0 || usernamesToFocus.length > 0){
                return;
            } else {
                hasNewCommitsWithinTime = true;
                numberOfCommitsWithinTime++;
                console.log("------------");
                console.log("This commit DOES meet the criteria that you wanted:");
                console.log(JSON.stringify(element));
                console.log("------------");
            }
            
        } else {
            console.log("------------");
            console.log("This commit did NOT meet the criteria that you wanted:");
            console.log(JSON.stringify(element));
            console.log("------------");
        }
    });

    core.setOutput("has-new-commits-within-time", hasNewCommitsWithinTime);
    core.setOutput("number-of-commits-within-time", numberOfCommitsWithinTime)

    console.log("The value of shouldWriteToFile is currently:");
    console.log(shouldWriteToFile);
    if (shouldWriteToFile || shouldWriteToFile == "true"){
        console.log("Building outputObj and calling writeOutputsToFile now...");
        outputObj.totalCommits = totalCommits;
        outputObj.numberOfCommitsWithinTime = numberOfCommitsWithinTime;
        outputObj.hasNewCommitsWithinTime = hasNewCommitsWithinTime;
        writeOutputsToFile();
    } else {
        console.log("Did NOT write to a file. :( ");
    }
}


async function writeOutputsToFile(){
    // write outputObj to JSON file as JSON

    // write to root of repository
    fs.writeFileSync('../outputFromCommitsWithinTime.json', JSON.stringify(outputObj));

    // upload to artifact
    const files = ['/outputFromCommitsWithinTime.json'];
    const rootDirectory = process.env.GITHUB_WORKSPACE;
    const options = {
        continueOnError: true
    }
    
    const uploadResponse = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)
    if (uploadResponse.failedItems.length > 0){
        console.log("Hey! Looks like something failed when uploading results to the Actions artifact. \n Failed items are:\n " + uploadResponse.failedItems);
    }

    // delete file that was made in root of repository to prevent any git changes being saved 
    fs.unlink("../outputFromCommitsWithinTime.json", (err) => {
        if (err) {
          console.error(err)
          return
        }
      
        //file removed
    })
}

gatherInfoOnCommitsWithinTime();