const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Function to get a random cat photo from The Cat API
async function getRandomCatPhoto() {
  try {
    const response = await axios.get('https://api.thecatapi.com/v1/images/search');
    return response.data[0].url;
  } catch (error) {
    console.error('Error fetching cat photo:', error);
    process.exit(1);
  }
}

// Function to download the image and save it
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

// Function to update the cat history
function updateCatHistory(issueCreator) {
  const historyPath = path.join(process.cwd(), 'cat-history.json');
  let history = { lastChangedBy: 'Unknown', timestamp: new Date().toISOString() };
  
  // Try to read existing history file
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (error) {
      console.warn('Could not parse history file, creating new one');
    }
  }
  
  // Store the previous changer to use in the issue comment
  const lastChanger = history.lastChangedBy;
  
  // Update history with new changer
  history.lastChangedBy = issueCreator;
  history.timestamp = new Date().toISOString();
  
  // Write updated history back to file
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  
  return lastChanger;
}

// Generate a unique filename for the cat image
function generateUniqueImageName() {
  // Generate a short hash based on current timestamp
  const hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex').substring(0, 8);
  return `cat-${hash}.jpg`;
}

// Function to update the README.md file
function updateReadme(issueCreator, timestamp, imageName) {
  const readmePath = path.join(process.cwd(), 'README.md');
  
  const readmeContent = `# Change the Cat!

![GitHub Repo stars](https://img.shields.io/github/stars/Saviru/change-the-cat?style=social)
![GitHub forks](https://img.shields.io/github/forks/Saviru/change-the-cat?style=social)


<hr id="top">


![Random Cat](./images/${imageName})

###### This cat photo was last changed by [@${issueCreator}](https://github.com/${issueCreator}) on ${timestamp}.


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
  console.log(`Using unique image filename: ${imageName}`);
}

async function main() {
  try {
    const issueCreator = process.env.ISSUE_CREATOR;
    const currentTimestamp = new Date();
    
    // 1. Get last changer and update history
    const lastChanger = updateCatHistory(issueCreator);
    console.log(`Last cat changer was: ${lastChanger}`);
    console.log(`New cat changer is: ${issueCreator}`);
    
    // 2. Get random cat photo
    const catPhotoUrl = await getRandomCatPhoto();
    console.log(`Got new cat photo: ${catPhotoUrl}`);
    
    // 3. Generate a unique filename for the cat image
    const uniqueImageName = generateUniqueImageName();
    console.log(`Generated unique image name: ${uniqueImageName}`);
    
    // 4. Save the cat photo with the unique name
    const imagePath = path.join(process.cwd(), 'images', uniqueImageName);
    await downloadImage(catPhotoUrl, imagePath);
    console.log(`Saved cat photo to: ${imagePath}`);
    
    // 5. Remove old cat images (optional, to prevent repository bloat)
    const imagesDir = path.join(process.cwd(), 'images');
    fs.readdirSync(imagesDir).forEach(file => {
      if (file !== uniqueImageName && file.startsWith('cat-')) {
        fs.unlinkSync(path.join(imagesDir, file));
        console.log(`Removed old cat image: ${file}`);
      }
    });
    
    // 6. Update README.md with the new cat photo filename
    updateReadme(issueCreator, currentTimestamp, uniqueImageName);
    
    // For GitHub Actions
    execSync(`echo "LAST_CHANGER=${lastChanger}" >> $GITHUB_ENV`);
    
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main();