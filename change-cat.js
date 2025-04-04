const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  
  // Set environment variable to use in GitHub Actions
  console.log(`::set-env name=LAST_CHANGER::${lastChanger}`);
  
  return lastChanger;
}

async function main() {
  try {
    const issueCreator = process.env.ISSUE_CREATOR;
    
    // 1. Get last changer and update history
    const lastChanger = updateCatHistory(issueCreator);
    console.log(`Last cat changer was: ${lastChanger}`);
    console.log(`New cat changer is: ${issueCreator}`);
    
    // 2. Get random cat photo
    const catPhotoUrl = await getRandomCatPhoto();
    console.log(`Got new cat photo: ${catPhotoUrl}`);
    
    // 3. Save the cat photo
    const imagePath = path.join(process.cwd(), 'images', 'cat.jpg');
    await downloadImage(catPhotoUrl, imagePath);
    console.log(`Saved cat photo to: ${imagePath}`);
    
    // For GitHub Actions compatibility (set-env is deprecated but using for simplicity)
    // In a production environment, use the appropriate GitHub Actions syntax
    execSync(`echo "LAST_CHANGER=${lastChanger}" >> $GITHUB_ENV`);
    
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main();