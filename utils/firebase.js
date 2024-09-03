const admin = require('firebase-admin');
const path = require('path');

// Path to your service account key file
const serviceAccountPath = path.join(__dirname, '../config/credentials/vf.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

// Function to send notifications
async function sendNotification(tokens, content, link = 'FLUTTER_NOTIFICATION_CLICK') {
  try {
    if (!tokens.length) return false;

    console.log("here tokens:", tokens);
    console.log("here content:", content);

    const message = {
      notification: {
        title: content.title || '',
        body: content.body || '',
      },
      tokens: tokens,
      data: {
        title: content.title || '',
        body: content.body || '',
        type: content.type || '',
        object: content.object || '',
        screen: content.screen || '',
        click_action: link,
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const response = await admin.messaging().sendMulticast(message);

    if (response.failureCount > 0) {
      const failedTokens = response.responses
        .filter((r) => !r.success)
        .map((_, i) => tokens[i]);
      throw new Error(`Failed to send notification to tokens: ${failedTokens.join(', ')}`);
    }

    return true;
  } catch (error) {
    throw new Error('Failed to send notification: ' + error.message);
  }
}

module.exports = { sendNotification };
