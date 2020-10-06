const core = require('@actions/core');
const github = require('@actions/github');

var { execSync } = require("child_process");

const gitCommand = "git rev-list --remotes --all --pretty"

var hasNewCommitsWithinTime = false;
var numberOfCommitsWithinTime = 0;
var totalCommits = 0;

var minutesRange = core.getInput("minutes") || 0;
var hoursRange = core.getInput("hours") || 24;
var daysRange = core.getInput("days") || 0;
var monthsRange = core.getInput("months") || 0;
var yearsRange = core.getInput("years") || 0;



function gitCommitInfoObj(commitHash, author, date) {
    return {
        commitHash: commitHash,
        author: author,
        date: date,
    };
}

function getGitRevMegaString() {
    return execSync(gitCommand).toString();
}

function gatherInfoOnCommitsWithinTime() {

    var gitRevHistoryMegaString = getGitRevMegaString();

    let gitMegaStringLines = gitRevHistoryMegaString.split("\n");
    gitMegaStringLines = gitMegaStringLines
        .map(item => {
            // Remove whitespace from valid strings
            item = item.trim();
            if (item.startsWith("commit") || item.startsWith("Author") || item.startsWith("Date")) {
                return item;
            }
        })
        .filter(item => {
            // Remove null, empty or otherwise falsey strings
            return item
        });

    var gitCommitObjs = [];

    for (let index = 0; index < gitMegaStringLines.length; index += 3) {
        let commitHashVal = gitMegaStringLines[index].substring(7, gitMegaStringLines[index].length);
        let authorVal = gitMegaStringLines[index + 1].substring(8, gitMegaStringLines[index + 1].length);
        let dateVal = Date.parse(gitMegaStringLines[index + 2].substring(8, gitMegaStringLines[index + 2].length));

        gitCommitObjs.push(gitCommitInfoObj(commitHashVal, authorVal, dateVal));
    }

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
        if (element.date > minDate && element.date <= maxDate) {
            hasNewCommitsWithinTime = true;
            numberOfCommitsWithinTime++;
        }
    });

    core.setOutput("has-new-commits-within-time", hasNewCommitsWithinTime);
    core.setOutput("number-of-commits-within-time", numberOfCommitsWithinTime)

}

gatherInfoOnCommitsWithinTime();