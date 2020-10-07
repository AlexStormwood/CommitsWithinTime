const core = require('@actions/core');
const github = require('@actions/github');

var { execSync } = require("child_process");

const gitCommand = 'git rev-list --remotes --format="CommitHash:%H%nAuthor:%an%nEmail:%ae%nCommitterAuthor:%cn%nCommitterEmail:%ce%nDate:%ct%nMessage:%s"';

var hasNewCommitsWithinTime = false;
var numberOfCommitsWithinTime = 0;
var totalCommits = 0;

var minutesRange = core.getInput("minutes") || 0;
var hoursRange = core.getInput("hours") || 24;
var daysRange = core.getInput("days") || 0;
var monthsRange = core.getInput("months") || 0;
var yearsRange = core.getInput("years") || 0;
var usernamesToIgnore = core.getInput("usernamesToIgnore") || [];
var emailAddressesToIgnore = core.getInput("emailAddressesToIgnore") || [];
var usernamesToFocus = core.getInput("usernamesToFocus") || [];
var emailAddressesToFocus = core.getInput("emailAddressesToFocus") || [];
var includeGithubActor = core.getInput("includeGithubActor") || true;
var includeActionsUser = core.getInput("includeActionsUser") || false;

// Make sure our Github Actor is not ignored if that option is set to true
if (includeGithubActor){
    let index = 0;
    while (index < usernamesToIgnore.length){
        if (usernamesToIgnore[index] === process.env.GITHUB_ACTOR){
            usernamesToIgnore.splice(index, 1);
        } else {
            i++;
        }
    }
}

if (!includeActionsUser) {
    usernamesToIgnore.push("actions-user");
    usernamesToIgnore.push("Github Actions");
    emailAddressesToIgnore.push("actions@github.com")
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

}

gatherInfoOnCommitsWithinTime();