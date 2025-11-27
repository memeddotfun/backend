import axios from "axios";

/**
 * Connects to Instagram and retrieves the user's access token
 * @param code - The code provided by Instagram
 * @returns The access token and business account information
 */
export const connectInstagram = async (code: string): Promise<{ username: string, user_id: string, access_token: string }> => {
    try {
    const formData = new FormData();
    formData.append('client_id', process.env.META_APP_ID!);
    formData.append('client_secret', process.env.INSTAGRAM_APP_SECRET!);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', `${process.env.FRONTEND_URL}/instagram-callback`); 
    formData.append('code', code);
    const response = await axios.post('https://api.instagram.com/oauth/access_token', formData);
    if (response.status !== 200) {
        throw new Error('Failed to connect to Instagram');
    }
    const shortLivedToken = response.data.access_token;
    const longLivedToken = await axios.get(`https://graph.instagram.com/access_token?client_secret=${process.env.INSTAGRAM_APP_SECRET}&grant_type=ig_exchange_token&access_token=${shortLivedToken}`);
    if (longLivedToken.status !== 200) {
        throw new Error('Failed to exchange token');
    }
    const businessAccount = await getInstagramBusinessAccount(longLivedToken.data.access_token);
    return { username: businessAccount.username, user_id: businessAccount.user_id, access_token: longLivedToken.data.access_token };
    } catch (error) {
        console.error('Failed to connect to Instagram:', error);
        throw new Error('Failed to connect to Instagram');
    }
};

export const refreshInstagramToken = async (refreshToken: string): Promise<string> => {
    try {
        if (!refreshToken) {
            throw new Error('Refresh token is required');
        }
        const response = await axios.get(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refreshToken}`);
        if (response.status !== 200) {
            throw new Error('Failed to refresh token');
        }
        return response.data.access_token;
    } catch (error) {
        console.error('Failed to refresh token:', error);
        throw new Error('Failed to refresh token');
    }
};   
/**
 * Retrieves the user's Instagram business account information
 * @param accessToken - The access token for the user
 * @returns The user's Instagram business account information
 */
export const getInstagramBusinessAccount = async (accessToken: string): Promise<{ username: string, user_id: string, followers_count: number }> => {
    const response = await axios.get('https://graph.instagram.com/v21.0/me?fields=username,user_id,followers_count', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    return response.data;
};

export const getInstagramInsights = async (userId: string, accessToken: string): Promise<any> => {
    const response = await axios.get(`https://graph.instagram.com/${userId}/insights?metric=total_interactions&period=day&access_token=${accessToken}`);
    if (response.data.data.length === 0) {
        return 0;
    }
    return response.data.data[0].values[0].value;
};