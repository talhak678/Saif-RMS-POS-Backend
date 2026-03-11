/**
 * Utility to send push notifications via Expo
 */
export async function sendExpoPushNotification(tokens: string[], title: string, body: string, data?: any) {
    if (!tokens || tokens.length === 0) return;

    // Filter out invalid or empty tokens
    const validTokens = tokens.filter(token => token && token.startsWith('ExponentPushToken'));
    if (validTokens.length === 0) return;

    const messages = validTokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
    }));

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const result = await response.json();
        console.log('Expo Push Response:', result);
        return result;
    } catch (error) {
        console.error('Error sending Expo push notification:', error);
    }
}
