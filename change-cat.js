const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// get a random cat photo from The Cat API
async function getRandomCatPhoto() {
  try {
    const response = await axios.get('https://api.thecatapi.com/v1/images/search');
    return response.data[0].url;
  } catch (error) {
    console.error('Error fetching cat photo:', error);
    process.exit(1);
  }
}


async function downloadImage(url, filepath) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    process.exit(1);
  }
}

// update the cat history
function updateCatHistory(issueCreator) {
  const historyPath = path.join(process.cwd(), 'cat-history.json');
  let history = { lastChangedBy: 'Unknown', timestamp: new Date().toISOString() };
  
  // Tread existing history file
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (error) {
      console.warn('Could not parse history file, creating new one');
    }
  }
  

  const lastChanger = history.lastChangedBy;
  

  history.lastChangedBy = issueCreator;
  history.timestamp = new Date().toISOString();
  
  // Wupdated history
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  
  return lastChanger;
}


function updateReadme(issueCreator, timestamp) {
  const readmePath = path.join(process.cwd(), 'README.md');
  const cacheBuster = Date.now();
  
  const readmeContent = `# Change the Cat!

![GitHub Repo stars](https://img.shields.io/github/stars/Saviru/change-the-cat?style=social)
![GitHub forks](https://img.shields.io/github/forks/Saviru/change-the-cat?style=social)

<hr id="top">
<p align="center">

![Random Cat](images/cat.jpg?v=${cacheBuster})
![Random Cat](images/${imageName})

###### This cat photo was last changed by [@${issueCreator}](https://github.com/${issueCreator}) on ${timestamp}.

</p>


[![Change Cat]][Link]

[Change Cat]: https://img.shields.io/badge/Click_here_to_change_the_cat-37a779?style=for-the-badge
[Link]: https://github.com/Saviru/change-the-cat/issues/new?template=meow-.md


<hr>

## How to get a new cat?

Create a new issue with the title "Meow!" and our workflow will automatically change the cat photo!

<br>

**Note:** *This will take a few seconds/minutes to update the cat photo.* Meow!😸 

<br><br>

Developed and maintained by [@Saviru](https://github.com/Saviru)
<br><br>
<hr>
<p align="center">Made with ❤️ for the GitHub community </p> 
`;

  fs.writeFileSync(readmePath, readmeContent);
  console.log('MEOW!');
  console.log(`Added cache buster: ?v=${cacheBuster}`);
}

async function main() {
  try {
    const issueCreator = process.env.ISSUE_CREATOR;
    const currentTimestamp = new Date();
    
    // Get last changer and update history
    const lastChanger = updateCatHistory(issueCreator);
    console.log(`Last cat changer was: ${lastChanger}`);
    console.log(`New cat changer is: ${issueCreator}`);
    
    // Get random cat photo
    const catPhotoUrl = await getRandomCatPhoto();
    console.log(`Got new cat photo: ${catPhotoUrl}`);
    
    // Save the cat photo
    const imagePath = path.join(process.cwd(), 'images', 'cat.jpg');
    await downloadImage(catPhotoUrl, imagePath);
    console.log(`Saved cat photo to: ${imagePath}`);
    
    // Update README.md with the new cat photo
    updateReadme(issueCreator, currentTimestamp);
    
    // For GitHub Actions
    execSync(`echo "LAST_CHANGER=${lastChanger}" >> $GITHUB_ENV`);
    
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main();